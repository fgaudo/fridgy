import './styles.css'
import { SplashScreen } from '@capacitor/splash-screen'
import * as Browser from '@effect/platform-browser'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Stream from 'effect/Stream'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

import * as StateManager from '@/core/state-manager.ts'

import { layer } from './runtime.ts'
import * as Home from './ui/home/slice.ts'
import { view } from './ui/view.ts'

const getRoot = Effect.sync(() => document.querySelector('#root')!)

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
	update: Home.update,
	defectMessage: Home.fatalMessage,
	subscriptions: Home.subscriptions,
})

Browser.BrowserRuntime.runMain(
	Effect.scoped(
		Effect.gen(function* () {
			const rootRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
				yield* getRoot,
			)

			const stateManager = yield* makeStateManager(Home.init)

			const run = yield* FiberSet.makeRuntime()

			const dispatch = (message: Home.Message) => {
				run(StateManager.dispatch(stateManager, message))
			}

			const streamReady = yield* Deferred.make()

			yield* StateManager.stateChanges(stateManager).pipe(
				Stream.onStart(Deferred.succeed(streamReady, undefined)),
				Stream.onFirst(() => hideSplashScreen),
				Stream.map(event => view(event, { dispatch })),
				Stream.runForEach(newVNode =>
					SynchronizedRef.updateEffect(rootRef, patch(newVNode)),
				),
				Effect.forkScoped,
			)

			yield* Deferred.await(streamReady)

			yield* StateManager.start(stateManager)

			return yield* Effect.never
		}),
	).pipe(Effect.provide(layer)),
)
