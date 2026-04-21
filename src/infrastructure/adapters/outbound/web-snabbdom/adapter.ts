import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import * as Browser from '@effect/platform-browser'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Clock from 'effect/Clock'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
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
	const uiLayer = Layer.mergeAll(
		Layer.succeed(MessageDispatcher, messageDispatcher),
		Layer.succeed(UiService, {
			showToast: text => Effect.promise(() => Toast.show({ text })),
			hideSplashScreen: Effect.promise(() => SplashScreen.hide()),
		}),
	)
	return { patch, containerRef, uiLayer }
})

export const hotLayer = Layer.effect(
	Renderer,
	Effect.gen(function* () {
		const { uiLayer, patch, containerRef } = yield* initRenderer
		const loadModule = Effect.gen(function* () {
			const modulePath = yield* Config.string('viewPath').pipe(
				Config.nested('hotModule'),
				Config.nested('ui'),
			)
			const millis = yield* Clock.currentTimeMillis
			const module = (yield* saferImport(
				`${modulePath}?t=${millis}`,
			)) as typeof Root
			return yield* module.makeView.pipe(Effect.provide(uiLayer))
		}).pipe(Effect.catchTag('ConfigError', Effect.die))
		const socket = yield* Socket.Socket
		const uiModuleRef = yield* SubscriptionRef.make(
			yield* loadModule.pipe(Effect.provide(uiLayer)),
		)
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
			.run(
				Effect.fn(function* () {
					const newView = yield* loadModule
					yield* refreshCss
					yield* SubscriptionRef.set(uiModuleRef, newView)
				}),
			)
			.pipe(Effect.forkScoped)
		return flow(
			Stream.zipLatest(SubscriptionRef.changes(uiModuleRef)),
			Stream.switchMap(([model, view]) =>
				Stream.fromEffect(
					SynchronizedRef.updateEffect(containerRef, node =>
						Effect.sync(() => patch(node, view(model))),
					),
				),
			),
			Stream.runDrain,
		)
	}),
).pipe(
	Layer.provide(
		Layer.unwrap(
			Effect.gen(function* () {
				const webSocketUrl = yield* Config.all([
					Config.string('host'),
					Config.number('port'),
				]).pipe(
					Config.nested('websocket'),
					Config.nested('hotModule'),
					Config.nested('ui'),
					Config.mapOrFail(([host, port]) =>
						Effect.sync(() => `ws://${host}:${port.toString(10)}`),
					),
				)
				return Browser.BrowserSocket.layerWebSocket(webSocketUrl)
			}).pipe(Effect.catchTag('ConfigError', Effect.die)),
		),
	),
)

export const staticLayer = Layer.effect(
	Renderer,
	Effect.gen(function* () {
		const { uiLayer, patch, containerRef } = yield* initRenderer
		const view = yield* (yield* Effect.promise(
			() => import('./pages/view.tsx'),
		)).makeView.pipe(Effect.provide(uiLayer))
		return flow(
			Stream.switchMap(model =>
				Stream.fromEffect(
					SynchronizedRef.updateEffect(containerRef, node =>
						Effect.sync(() => patch(node, view(model))),
					),
				),
			),
			Stream.runDrain,
		)
	}),
).pipe(Layer.orDie)
