import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import * as Browser from '@effect/platform-browser'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Clock from 'effect/Clock'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Socket from 'effect/unstable/socket/Socket'
import * as Snabbdom from 'snabbdom'

import { Renderer } from '@/app/ports/renderer.ts'
import { MessageDispatcher } from '@/app/ports/state-manager/message-dispatcher.ts'
import { safeImport } from '@/shared/safe.ts'

import type * as Root from './pages/view.tsx'
import { UiService } from './ui-service.ts'

const loadFonts = Effect.gen(function* () {
	const [comfortaaLatinPath, comfortaaLatinExtPath] = yield* Config.all([
		Config.string('comfortaaLatinPath'),
		Config.string('comfortaaLatinExtPath'),
	]).pipe(Config.nested('font'), Config.nested('ui'))
	const comfortaaLatinExt = new FontFace(
		'Comfortaa',
		`url(${comfortaaLatinExtPath})`,
		{
			style: 'normal',
			weight: '300 700',
			display: 'swap',
			unicodeRange:
				'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
		},
	)
	const comfortaaLatin = new FontFace(
		'Comfortaa',
		`url(${comfortaaLatinPath})`,
		{
			style: 'normal',
			weight: '300 700',
			display: 'swap',
			unicodeRange:
				'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
		},
	)
	yield* Effect.sync(() => {
		document.fonts.add(comfortaaLatinExt)
		document.fonts.add(comfortaaLatin)
	})
	yield* Effect.all(
		[
			Effect.promise(() => comfortaaLatinExt.load()),
			Effect.promise(() => comfortaaLatin.load()),
		],
		{ concurrency: 'unbounded' },
	)
}).pipe(Effect.catchTag('ConfigError', Effect.die))

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
			const module = (yield* safeImport(
				`${modulePath}?t=${millis}`,
			)) as typeof Root
			return yield* module.makeView.pipe(Effect.provide(uiLayer))
		}).pipe(Effect.catchTag('ConfigError', Effect.die))
		const socket = yield* Socket.Socket
		const uiModuleRef = yield* SubscriptionRef.make(
			yield* loadModule.pipe(Effect.provide(uiLayer)),
		)
		const cssLinkElement = yield* Effect.gen(function* () {
			return yield* Effect.sync(() => document.querySelector('#css')!)
		})
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
		return model =>
			SubscriptionRef.changes(uiModuleRef).pipe(
				Stream.mapEffect(view =>
					SynchronizedRef.updateEffect(containerRef, node =>
						Effect.sync(() => patch(node, view(model))),
					),
				),
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
		return model =>
			Stream.fromEffect(
				SynchronizedRef.updateEffect(containerRef, node =>
					Effect.sync(() => patch(node, view(model))),
				),
			)
	}),
).pipe(Layer.orDie)
