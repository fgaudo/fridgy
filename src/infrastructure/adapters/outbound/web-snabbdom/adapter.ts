import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Clock from 'effect/Clock'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as PubSub from 'effect/PubSub'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Socket from 'effect/unstable/socket/Socket'
import * as Snabbdom from 'snabbdom'

import { MessageDispatcher } from '@/app/ports/inbound/message-dispatcher.ts'
import { Renderer } from '@/app/ports/outbound/model-renderer.ts'
import { saferImport } from '@/shared/safe.ts'

import type * as Root from './pages/view.tsx'
import { UiService } from './ui-service.ts'

const loadFonts = Effect.asVoid(
	Effect.all(
		[
			Effect.promise(() =>
				document.fonts.load('1em "Material Symbols Rounded"'),
			),
			Effect.promise(() =>
				document.fonts.load("1em 'Noto Sans Variable'", ' \u0000'),
			),
		],
		{ concurrency: 'unbounded' },
	),
)

const loadAssets = Effect.all(
	[loadFonts, Effect.promise(() => defineCustomElements(window))],
	{ concurrency: 'unbounded' },
)

const initRenderer = Effect.gen(function* () {
	const root = yield* Effect.sync(() => document.querySelector('#root')!)
	yield* loadAssets
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
	const messageDispatcher = yield* MessageDispatcher
	const invalidatePubSub = yield* Effect.acquireRelease(
		PubSub.unbounded<void>({ replay: 1 }),
		q => PubSub.shutdown(q),
	)
	yield* PubSub.publish(invalidatePubSub, undefined)
	const uiLayer = Layer.mergeAll(
		Layer.succeed(MessageDispatcher, messageDispatcher),
		Layer.succeed(UiService, {
			hideSplashScreen: Effect.promise(() => SplashScreen.hide()),
			invalidateUi: PubSub.publish(invalidatePubSub, undefined),
			showToast: text => Effect.promise(() => Toast.show({ text })),
		}),
	)
	return {
		containerRef,
		invalidate$: Stream.fromPubSub(invalidatePubSub),
		patch,
		uiLayer,
	}
})

export const hotLayer = Layer.effect(
	Renderer,
	Effect.gen(function* () {
		const { uiLayer, patch, containerRef, invalidate$ } = yield* initRenderer
		const modulePath = yield* Config.string('viewPath').pipe(
			Config.nested('hotModule'),
			Config.nested('ui'),
		)
		const loadModule = Effect.gen(function* () {
			const millis = yield* Clock.currentTimeMillis
			const module = (yield* saferImport(
				`${modulePath}?t=${millis}`,
			)) as typeof Root
			return yield* module.makeView.pipe(Effect.provide(uiLayer))
		})
		const socket = yield* Socket.Socket
		const uiModuleRef = yield* SubscriptionRef.make(loadModule)
		const cssLinkElement = yield* Effect.sync(
			() => document.querySelector('#css')!,
		)
		const refreshCss = Effect.gen(function* () {
			const millis = yield* Clock.currentTimeMillis
			const href = yield* Effect.sync(
				() => cssLinkElement.getAttribute('href')!,
			)
			const url = new URL(href, window.location.origin)
			url.searchParams.set('t', millis.toString())
			yield* Effect.sync(() => {
				cssLinkElement.setAttribute('href', url.toString())
			})
		})
		yield* socket
			.run(() => SubscriptionRef.set(uiModuleRef, loadModule))
			.pipe(Effect.forkScoped)
		return model$ =>
			SubscriptionRef.changes(uiModuleRef).pipe(
				Stream.switchMap(makeView =>
					Stream.zipLatestAll(
						model$,
						Stream.fromEffect(
							Effect.gen(function* () {
								yield* refreshCss
								return yield* makeView
							}),
						),
						invalidate$,
					).pipe(
						Stream.mapEffect(([model, view]) =>
							SynchronizedRef.updateEffect(containerRef, node =>
								Effect.sync(() => patch(node, view(model))),
							),
						),
						Stream.switchMap(() => Stream.never),
						Stream.scoped,
					),
				),
				Stream.runDrain,
			)
	}),
).pipe(Layer.orDie)

export const staticLayer = Layer.effect(
	Renderer,
	Effect.gen(function* () {
		const { uiLayer, patch, containerRef, invalidate$ } = yield* initRenderer
		const makeView = (yield* Effect.promise(
			() => import('./pages/view.tsx'),
		)).makeView.pipe(Effect.provide(uiLayer))
		return model$ =>
			Stream.zipLatestAll(
				Stream.fromEffect(makeView),
				model$,
				invalidate$,
			).pipe(
				Stream.mapEffect(([view, model]) =>
					SynchronizedRef.updateEffect(containerRef, node =>
						Effect.sync(() => patch(node, view(model))),
					),
				),
				Stream.switchMap(() => Stream.never),
				Stream.scoped,
				Stream.runDrain,
			)
	}),
).pipe(Layer.orDie)
