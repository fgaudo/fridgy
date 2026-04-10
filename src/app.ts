import './styles.css'
import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as T from 'effect/Tuple'
import * as Snabbdom from 'snabbdom'

import { sql as sqlDeps } from '@/business/sql.ts'
import * as StateManager from '@/core/state-manager.ts'

import { migrations } from './business/adapters/sql/migrations.ts'
import type { Message } from './ui/messages.ts'
import * as Root from './ui/state.ts'
import * as RootView from './ui/view.ts'

const root = document.querySelector('#root')!

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

const makeStateManager = StateManager.prepare({
	update: Root.update,
	defectMessage: Root.fatalMessage,
	subscriptions: Root.subscriptions,
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

Browser.BrowserRuntime.runMain(
	Effect.scoped(
		Effect.gen(function* () {
			const containerRef = yield* SynchronizedRef.make<
				Element | Snabbdom.VNode
			>(root)
			const manager = yield* makeStateManager(Root.init)
			const run = yield* FiberSet.makeRuntimePromise()
			const dispatch = (message: Message) => {
				void run(StateManager.dispatch(manager, message))
			}
			const ready = yield* Deferred.make()
			yield* StateManager.stateChanges(manager).pipe(
				Stream.onStart(Deferred.succeed(ready, undefined)),
				Stream.map(([state, maybeMessage]) =>
					T.make(Root.makeModel(state), maybeMessage),
				),
				Stream.tap(([model]) =>
					SynchronizedRef.updateEffect(
						containerRef,
						patch(RootView.view(model, { dispatch })),
					),
				),
				Stream.runDrain,
				Effect.forkScoped,
			)
			yield* Deferred.await(ready)
			return yield* StateManager.runLoop(manager)
		}),
	).pipe(Effect.provide(layer)),
)
