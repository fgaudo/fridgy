import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'

import { hotLayer } from '@/adapters/module-emitter/hot.ts'
import * as Sql from '@/adapters/product-repo/sql.ts'
import { snabbdomRendererLayer } from '@/adapters/snabbdom-renderer.ts'
import { stateManagerLayer } from '@/adapters/state-manager/default/index.ts'
import type { Message } from '@/ports/inbound/message-dispatcher.ts'
import { MessageDispatcher } from '@/ports/inbound/message-dispatcher.ts'
import { UiModuleEmitter } from '@/ports/inbound/ui-module-emitter.ts'
import { ModelEmitter } from '@/ports/outbound/model-emitter/index.ts'
import { Renderer } from '@/ports/outbound/renderer.ts'
import { all } from '@/use-cases/index.ts'

const root = document.querySelector('#root')!
const css = document.querySelector('#css')!

export const useCasesLayer = (() => {
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
		const render = yield* Renderer
		const module$ = yield* UiModuleEmitter
		const messageDispatcher = yield* MessageDispatcher
		const model$ = yield* ModelEmitter
		const run = yield* FiberSet.makeRuntimePromise()
		const dispatch = (message: Message) => {
			void run(messageDispatcher(message))
		}
		yield* model$.pipe(
			Stream.zipLatestWith(
				module$,
				(model, module) => [model, module] as const,
			),
			Stream.map(([model, { view }]) => view(model, { dispatch })),
			Stream.tap(render),
			Stream.runDrain,
		)
	}).pipe(
		Effect.scoped,
		Effect.provide([
			Layer.succeed(References.MinimumLogLevel, 'Debug'),
			stateManagerLayer.pipe(Layer.provideMerge(useCasesLayer)),
			hotLayer({ modulePath: './view.js', cssLinkElement: css }).pipe(
				Layer.provide(
					Browser.BrowserSocket.layerWebSocket('ws://localhost:3000'),
				),
			),
			snabbdomRendererLayer(root),
		]),
	),
)
