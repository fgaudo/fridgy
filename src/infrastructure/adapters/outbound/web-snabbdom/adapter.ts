import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Clock from 'effect/Clock'
import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Socket from 'effect/unstable/socket/Socket'
import * as Snabbdom from 'snabbdom'

import { Renderer } from '@/app/ports/outbound/model-renderer.ts'
import { saferImport } from '@/shared/safe.ts'

import type * as Root from './pages/view.tsx'
import { UiService } from './ui-service.ts'

const AssetLoader = Layer.effectDiscard(
	Effect.all(
		[
			Effect.promise(() =>
				document.fonts.load('1em "Material Symbols Rounded"'),
			),
			Effect.promise(() =>
				document.fonts.load("1em 'Noto Sans Variable'", ' \u0000'),
			),
			Effect.promise(() => defineCustomElements(window)),
		],
		{ concurrency: 'unbounded' },
	),
)

class CssRefresher extends Context.Service<CssRefresher, Effect.Effect<void>>()(
	'a6e12404b8c6e5c5',
) {}

const CssRefresherLive = Layer.effect(
	CssRefresher,
	Effect.gen(function* () {
		const cssLinkElement = yield* Effect.sync(
			() => document.querySelector('#css')!,
		).pipe(
			Effect.tapDefect(error =>
				Effect.logFatal('Error while reading css selector', error),
			),
		)
		return Effect.gen(function* () {
			const millis = yield* Clock.currentTimeMillis
			const href = yield* Effect.sync(
				() => cssLinkElement.getAttribute('href')!,
			).pipe(
				Effect.tapDefect(error =>
					Effect.logFatal('Error while reading href attribute of css', error),
				),
			)
			const url = new URL(href, window.location.origin)
			url.searchParams.set('t', millis.toString())
			yield* Effect.sync(() => {
				cssLinkElement.setAttribute('href', url.toString())
			})
		})
	}),
)

class ViewLoader extends Context.Service<
	ViewLoader,
	(typeof Root)['makeView']
>()('32ea9a5a2f5d3dc7') {}

const ViewLoaderLive = Layer.effect(
	ViewLoader,
	Effect.gen(function* () {
		const modulePath = yield* Config.string('viewPath').pipe(
			Config.nested('hotModule'),
			Config.nested('ui'),
		)
		return Effect.gen(function* () {
			const millis = yield* Clock.currentTimeMillis
			const module = (yield* saferImport(
				`${modulePath}?t=${millis}`,
			)) as typeof Root
			return yield* module.makeView
		})
	}),
).pipe(Layer.orDie)

class ModuleLoader extends Context.Service<
	ModuleLoader,
	Stream.Stream<(typeof Root)['makeView']>
>()('47f105e232a56907') {}

const HotModuleLoaderLive = Layer.effect(
	ModuleLoader,
	Effect.gen(function* () {
		const refreshCss = yield* CssRefresher
		const loadView = yield* ViewLoader
		const socket = yield* Socket.Socket
		const uiModuleRef = yield* SubscriptionRef.make(loadView)
		yield* socket
			.run(() =>
				SubscriptionRef.set(
					uiModuleRef,
					Effect.gen(function* () {
						yield* refreshCss
						return yield* loadView
					}),
				),
			)
			.pipe(Effect.forkScoped)
		return SubscriptionRef.changes(uiModuleRef)
	}),
).pipe(Layer.orDie)

const StaticModuleLoaderLive = Layer.effect(
	ModuleLoader,
	Effect.gen(function* () {
		const module = yield* Effect.promise(() => import('./pages/view.tsx'))
		return Stream.make(module.makeView)
	}),
)

class NativeActions extends Context.Service<
	NativeActions,
	{
		hideSplashScreen: Effect.Effect<void>
		showToast: (text: string) => Effect.Effect<void>
	}
>()('8cfe3ec7d4e27297') {}

const NativeActionsLive = Layer.succeed(NativeActions, {
	hideSplashScreen: Effect.promise(() => SplashScreen.hide()),
	showToast: text => Effect.promise(() => Toast.show({ text })),
})

const UiServiceLive = Layer.unwrap(
	Effect.gen(function* () {
		const native = yield* NativeActions
		const invalidatePubSub = yield* Effect.acquireRelease(
			PubSub.unbounded<void>({ replay: 1 }),
			q => PubSub.shutdown(q),
		)
		yield* PubSub.publish(invalidatePubSub, undefined)
		return Layer.mergeAll(
			Layer.effect(
				UiService,
				Effect.gen(function* () {
					return {
						hideSplashScreen: native.hideSplashScreen,
						invalidateUi: PubSub.publish(invalidatePubSub, undefined),
						showToast: native.showToast,
					}
				}),
			),
			Layer.succeed(Invalidations, Stream.fromPubSub(invalidatePubSub)),
		)
	}),
)

class Patcher extends Context.Service<
	Patcher,
	(vnode: Snabbdom.VNode) => Effect.Effect<void>
>()('cb384bdf1c9a48bb') {}

const PatcherLive = Layer.effect(
	Patcher,
	Effect.gen(function* () {
		const root = yield* Effect.sync(
			() => document.querySelector('#root')!,
		).pipe(
			Effect.tapDefect(error =>
				Effect.logFatal('Error while reading root query selector', error),
			),
		)
		const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
			root,
		)
		const patch = yield* Effect.sync(() =>
			Snabbdom.init([
				Snabbdom.classModule,
				Snabbdom.propsModule,
				Snabbdom.styleModule,
				Snabbdom.attributesModule,
				Snabbdom.eventListenersModule,
			]),
		)
		return vnode =>
			SynchronizedRef.updateEffect(containerRef, node =>
				Effect.sync(() => patch(node, vnode)),
			)
	}),
)

class Invalidations extends Context.Service<
	Invalidations,
	Stream.Stream<void>
>()('648d60ed8b7e1a77') {}

const layer = Layer.effect(
	Renderer,
	Effect.gen(function* () {
		const invalidate$ = yield* Invalidations
		const makeView$ = yield* ModuleLoader
		const patcher = yield* Patcher
		const uiService = yield* UiService
		return model$ =>
			makeView$.pipe(
				Stream.switchMap(makeView =>
					Stream.zipLatestAll(
						model$,
						Stream.fromEffect(
							makeView.pipe(Effect.provideService(UiService, uiService)),
						),
						invalidate$,
					).pipe(
						Stream.mapEffect(([model, view]) => patcher(view(model))),
						Stream.switchMap(() => Stream.never),
						Stream.scoped,
					),
				),
				Stream.runDrain,
			)
	}),
)

export const HotLive = layer.pipe(
	Layer.provide([
		AssetLoader,
		UiServiceLive.pipe(Layer.provide(NativeActionsLive)),
		PatcherLive,
		HotModuleLoaderLive.pipe(Layer.provide([CssRefresherLive, ViewLoaderLive])),
	]),
)

export const StaticLive = layer.pipe(
	Layer.provide([
		AssetLoader,
		UiServiceLive.pipe(Layer.provide(NativeActionsLive)),
		PatcherLive,
		StaticModuleLoaderLive,
	]),
)
