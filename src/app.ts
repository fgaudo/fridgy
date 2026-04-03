import './styles.css'
import { SplashScreen } from '@capacitor/splash-screen'
import * as Browser from '@effect/platform-browser'
import * as SqliteWasm from '@effect/sql-sqlite-wasm'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
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

const hideSplashScreen = Effect.promise(() => SplashScreen.hide())

const makeStateManager = StateManager.prepare({
	update: Root.update,
	defectMessage: Root.fatalMessage,
	subscriptions: Root.subscriptions,
})

export const layer = sqlDeps.pipe(
	Layer.provide(
		SqliteWasm.SqliteClient.layer({
			worker: Effect.acquireRelease(
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
			),
		}),
	),
	Layer.orDie,
)

Browser.BrowserRuntime.runMain(
	Effect.scoped(
		Effect.gen(function* () {
			const rootRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
				root,
			)

			const stateManager = yield* makeStateManager(Root.init)

			const run = yield* FiberSet.makeRuntimePromise()

			const dispatch = (message: Root.Message) => {
				void run(StateManager.dispatch(stateManager, message))
			}

			{
				const db = {
					deleteProducts: yield* UC.DeleteProductsByIds.DeleteProductsByIds,
					getProducts: yield* UC.GetProducts.GetProducts,
					addProduct: yield* UC.AddProduct.AddProduct,
				}

				window.fridgyDB = {
					deleteProducts: (id: Parameters<typeof db.deleteProducts>[0]) =>
						run(db.deleteProducts(id)),
					getProducts: () => run(db.getProducts),
					addProduct: (product: Parameters<typeof db.addProduct>[0]) =>
						run(db.addProduct(product)),
				}
			}

			const streamReady = yield* Deferred.make()

			yield* StateManager.stateChanges(stateManager).pipe(
				Stream.onStart(Deferred.succeed(streamReady, undefined)),
				Stream.onFirst(() => hideSplashScreen),
				Stream.map(event => view(Root.makeModel(event[0]), { dispatch })),
				Stream.runForEach(newVNode =>
					SynchronizedRef.updateEffect(rootRef, patch(newVNode)),
				),
				Effect.forkScoped,
			)

			yield* Deferred.await(streamReady)

			return yield* StateManager.runLoop(stateManager)
		}),
	).pipe(Effect.provide(layer)),
)
