import './styles.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

import { sql as sqlDeps } from '@/business/sql.ts'
import * as StateManager from '@/core/state-manager.ts'

import * as UC from './business/use-cases/index.ts'
import * as Root from './ui/state.ts'
import { view } from './ui/view.ts'

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
	return sqlDeps.pipe(
		Layer.provide(
			SqliteWasm.SqliteClient.layer({
				worker: makeWorker,
			}),
		),
		Layer.orDie,
	)
})()

const applyInitialImpurity = Effect.promise(() => SplashScreen.hide())

const applyImpurities = Match.type<Root.Message>().pipe(
	Match.tag('GotHomeMsg', ({ message }) =>
		Match.value(message).pipe(
			Match.tag('DeleteAndRefreshFailed', () =>
				Effect.promise(() => Toast.show({ text: 'Delete failed' })),
			),
			Match.tag('DeleteSucceededButRefreshFailed', () =>
				Effect.promise(() =>
					Toast.show({ text: 'Delete succeeded but refresh failed' }),
				),
			),
			Match.orElse(() => Effect.void),
		),
	),
	Match.orElse(() => Effect.void),
)

declare global {
	interface Window {
		db: object
	}
}

Browser.BrowserRuntime.runMain(
	Effect.scoped(
		Effect.gen(function* () {
			const ref = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(root)
			const manager = yield* makeStateManager(Root.init)
			const run = yield* FiberSet.makeRuntimePromise()
			const dispatch = (message: Root.Message) => {
				void run(StateManager.dispatch(manager, message))
			}
			window.db = yield* Effect.gen(function* () {
				const db = {
					deleteProducts: yield* UC.DeleteProductsByIds.DeleteProductsByIds,
					getProducts: yield* UC.GetProducts.GetProducts,
					addProduct: yield* UC.AddProduct.AddProduct,
				}
				return {
					deleteProducts: (id: Parameters<typeof db.deleteProducts>[0]) =>
						run(db.deleteProducts(id)),
					getProducts: () => run(db.getProducts),
					addProduct: (product: Parameters<typeof db.addProduct>[0]) =>
						run(db.addProduct(product)),
				}
			})
			const ready = yield* Deferred.make()
			yield* StateManager.stateChanges(manager).pipe(
				Stream.onStart(Deferred.succeed(ready, undefined)),
				Stream.tap(([state, maybeMessage]) =>
					Effect.all([
						SynchronizedRef.updateEffect(
							ref,
							patch(view(Root.makeModel(state), dispatch)),
						),
						maybeMessage.pipe(
							Option.match({
								onNone: () => applyInitialImpurity,
								onSome: applyImpurities,
							}),
						),
					]),
				),
				Stream.runDrain,
				Effect.forkScoped,
			)
			yield* Deferred.await(ready)
			return yield* StateManager.runLoop(manager)
		}),
	).pipe(Effect.provide(layer)),
)
