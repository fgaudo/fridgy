import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

import * as Sql from '@/adapters/product-repo/sql-product.ts'
import type { Message } from '@/ports/inbound/message-dispatcher.ts'
import { all } from '@/use-cases/index.ts'

import { hotLayer } from './adapters/module-emitter/hot.ts'
import { noopModuleEmitter } from './adapters/module-emitter/noop.ts'
import { stateManagerLayer } from './adapters/state-manager/default/index.ts'
import { MessageDispatcher } from './ports/inbound/message-dispatcher.ts'
import { ModelEmitter } from './ports/outbound/model-emitter/index.ts'
import { ModuleEmitter } from './ports/outbound/module-emitter.ts'

const root = document.querySelector('#root')!
const css = document.querySelector('#css')!

const patch = (() => {
	const _patch = Snabbdom.init([
		Snabbdom.classModule,
		Snabbdom.propsModule,
		Snabbdom.styleModule,
		Snabbdom.eventListenersModule,
	])
	return (that: Parameters<typeof _patch>[1]) =>
		(self: Parameters<typeof _patch>[0]) =>
			Effect.sync(() => _patch(self, that))
})()

export const layer = (() => {
	const makeWorker = Effect.acquireRelease(
		Effect.sync(
			() =>
				new Worker('/sqlite-worker.js', {
					type: 'module',
				}),
		),
		worker =>
			Effect.sync(() => {
				worker.terminate()
			}),
	)
	const clientLayer = SqliteWasm.SqliteClient.layer({
		worker: makeWorker,
	})
	const migratorLayer = SqliteWasm.SqliteMigrator.layer({
		loader: SqliteWasm.SqliteMigrator.fromRecord(Sql.migrations),
	}).pipe(Layer.provideMerge(clientLayer))
	const sql = all.pipe(Layer.provide(Sql.layer))
	return sql.pipe(Layer.provide(migratorLayer), Layer.orDie)
})()

Browser.BrowserRuntime.runMain(
	Effect.gen(function* () {
		const views = yield* ModuleEmitter
		const messageDispatcher = yield* MessageDispatcher
		const modelEmitter = yield* ModelEmitter
		const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
			root,
		)
		const run = yield* FiberSet.makeRuntimePromise()
		const dispatch = (message: Message) => {
			void run(messageDispatcher(message))
		}
		yield* modelEmitter.pipe(
			Stream.zipLatestWith(views, (model, view) => [model, view] as const),
			Stream.map(([model, view]) => view(model, { dispatch })),
			Stream.tap(view =>
				SynchronizedRef.updateEffect(containerRef, patch(view)),
			),
			Stream.runDrain,
		)
	}).pipe(
		Effect.scoped,
		Effect.provide([
			Layer.succeed(References.MinimumLogLevel, 'Debug'),
			stateManagerLayer.pipe(Layer.provideMerge(layer)),
			hotLayer({ modulePath: './view.js', cssLinkElement: css }).pipe(
				Layer.provide(
					Browser.BrowserSocket.layerWebSocket('ws://localhost:3000'),
				),
			),
		]),
	),
)
