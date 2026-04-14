import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Clock from 'effect/Clock'
import * as Context from 'effect/Context'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import { Socket } from 'effect/unstable/socket'
import * as Snabbdom from 'snabbdom'

import { migrations } from '@/business/adapters/sql/migrations.ts'
import { sql as sqlDeps } from '@/business/sql.ts'
import * as Engine from '@/core/fsm.ts'

import type { Message } from './ui/messages.ts'
import * as Root from './ui/state.ts'

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

const makeEngine = Engine.prepare({
	update: Root.update,
	handleDefect: Root.handleDefect,
	emitter: Root.subscriptions,
})

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
		loader: SqliteWasm.SqliteMigrator.fromRecord(migrations),
	}).pipe(Layer.provideMerge(clientLayer))
	return sqlDeps.pipe(Layer.provide(migratorLayer), Layer.orDie)
})()

export class Reloader extends Context.Service<
	Reloader,
	{
		readonly changes: Stream.Stream<any>
	}
>()('1a31ca6f709175d4') {}

export const loadView = Effect.gen(function* () {
	const millis = yield* Clock.currentTimeMillis
	const { view } = yield* Effect.promise(() => import(`./view.js?t=${millis}`))
	return view
})

export const HotModuleReloader = Layer.effect(
	Reloader,
	Effect.gen(function* () {
		const initialView = yield* loadView
		const view = yield* SubscriptionRef.make(initialView)
		const socket = yield* Socket.Socket

		const triggerReload = Effect.gen(function* () {
			const newView = yield* loadView
			yield* refreshCss
			yield* SubscriptionRef.set(view, newView)
		})

		yield* socket.run(() => triggerReload).pipe(Effect.forkScoped)

		return { changes: SubscriptionRef.changes(view) }
	}),
)

export const NoOpReloader = Layer.effect(
	Reloader,
	Effect.gen(function* () {
		const { view: staticView } = yield* Effect.promise(
			() => import('./ui/view.ts'),
		)
		const view = yield* SubscriptionRef.make(staticView)

		return {
			changes: SubscriptionRef.changes(view),
		}
	}),
)

export const refreshCss = Effect.gen(function* () {
	const millis = yield* Clock.currentTimeMillis
	const href = yield* Effect.sync(() => css.getAttribute('href')!)
	const url = new URL(href, window.location.origin)
	url.searchParams.set('t', millis.toString())
	yield* Effect.sync(() => css.setAttribute('href', url.toString()))
})

Browser.BrowserRuntime.runMain(
	Effect.gen(function* () {
		const reloader = yield* Reloader
		const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
			root,
		)
		const engine = yield* makeEngine(Root.init)
		const run = yield* FiberSet.makeRuntimePromise()
		const dispatch = (message: Message) => {
			void run(Engine.dispatch(engine, [message]))
		}
		const ready = yield* Deferred.make()
		yield* Engine.transitions(engine).pipe(
			Stream.onStart(Deferred.succeed(ready, undefined)),
			Stream.map(({ state }) => state),
			Stream.zipLatestWith(
				reloader.changes,
				(state, view) => [state, view] as const,
			),
			Stream.map(([state, view]) => view(Root.makeModel(state), { dispatch })),
			Stream.tap(Effect.log),
			Stream.tap(view =>
				SynchronizedRef.updateEffect(containerRef, patch(view)),
			),
			Stream.runDrain,
			Effect.forkScoped,
		)
		yield* Deferred.await(ready)
		return yield* Engine.runLoop(engine)
	}).pipe(
		Effect.scoped,
		Effect.provide([
			layer,
			Layer.succeed(References.MinimumLogLevel, 'Debug'),
			HotModuleReloader.pipe(
				Layer.provide(
					Browser.BrowserSocket.layerWebSocket('ws://localhost:3000'),
				),
			),
		]),
	),
)
