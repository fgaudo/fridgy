import * as Browser from '@effect/platform-browser'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Socket from 'effect/unstable/socket'
import * as Snabbdom from 'snabbdom'

import {
	UiModuleEmitter,
	type UiModule,
} from '@/app/ports/inbound/ui-module-emitter.ts'
import { View, Renderer } from '@/app/ports/outbound/renderer.ts'
import { safeImport } from '@/shared/safe.ts'

const loadFonts = Effect.fn(function* ({
	comfortaaLatinExtFontPath,
	comfortaaLatinFontPath,
}: {
	comfortaaLatinExtFontPath: string
	comfortaaLatinFontPath: string
}) {
	const comfortaaLatinExt = new FontFace(
		'Comfortaa',
		`url(${comfortaaLatinExtFontPath})`,
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
		`url(${comfortaaLatinFontPath})`,
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
})

const loadAssets = Effect.fn(function* ({
	comfortaaLatinExtFontPath,
	comfortaaLatinFontPath,
}: {
	comfortaaLatinExtFontPath: string
	comfortaaLatinFontPath: string
}) {
	return yield* Effect.all(
		[
			loadFonts({
				comfortaaLatinExtFontPath,
				comfortaaLatinFontPath,
			}),
			Effect.promise(() => defineCustomElements(window)),
		],
		{ concurrency: 'unbounded' },
	)
})

const rendererLayer = (rootSelector: string) =>
	Layer.effect(
		Renderer,
		Effect.gen(function* () {
			const root = yield* Effect.sync(
				() => document.querySelector(rootSelector)!,
			)
			const containerRef = yield* SynchronizedRef.make<
				Element | Snabbdom.VNode
			>(root)
			const patch = Snabbdom.init([
				Snabbdom.classModule,
				Snabbdom.propsModule,
				Snabbdom.styleModule,
				Snabbdom.attributesModule,
				Snabbdom.eventListenersModule,
			])
			return view =>
				SynchronizedRef.updateEffect(containerRef, node =>
					Effect.sync(() => patch(node, View.get(view) as Snabbdom.VNode)),
				)
		}),
	).pipe(Layer.orDie)

const noopUiModuleLoaderLayer = (path: string) =>
	Layer.effect(
		UiModuleEmitter,
		Effect.gen(function* () {
			const module = (yield* safeImport(path)) as UiModule
			return Stream.make(module)
		}),
	)

const hotUiModuleLoaderLayer = ({
	modulePath,
	cssLinkSelector,
}: {
	modulePath: string
	cssLinkSelector: string
}) =>
	Layer.effect(
		UiModuleEmitter,
		Effect.gen(function* () {
			const cssLinkElement = yield* Effect.sync(
				() => document.querySelector(cssLinkSelector)!,
			)

			const loadView = Effect.gen(function* () {
				const millis = yield* Clock.currentTimeMillis
				const module = (yield* safeImport(
					`${modulePath}?t=${millis}`,
				)) as UiModule
				return module
			})

			const initialView: UiModule = yield* loadView
			const view = yield* SubscriptionRef.make(initialView)
			const socket = yield* Socket.Socket.Socket

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
				.run(() =>
					Effect.gen(function* () {
						const newView = yield* loadView
						yield* refreshCss
						yield* SubscriptionRef.set(view, newView)
					}),
				)
				.pipe(Effect.forkScoped)

			return SubscriptionRef.changes(view)
		}),
	)

export const uiLayer = ({
	comfortaaLatinExtFontPath,
	comfortaaLatinFontPath,
	rootSelector,
	uiModulePath,
}: {
	comfortaaLatinExtFontPath: string
	comfortaaLatinFontPath: string
	uiModulePath: string
	rootSelector: string
}) =>
	Layer.unwrap(
		Effect.gen(function* () {
			yield* loadAssets({
				comfortaaLatinExtFontPath,
				comfortaaLatinFontPath,
			})

			return Layer.mergeAll(
				rendererLayer(rootSelector),
				noopUiModuleLoaderLayer(uiModulePath),
			)
		}),
	)

export const uiHotLayer = ({
	cssLinkSelector,
	comfortaaLatinExtFontPath,
	comfortaaLatinFontPath,
	rootSelector,
	uiModulePath,
	webSocketUrl,
}: {
	cssLinkSelector: string
	comfortaaLatinExtFontPath: string
	comfortaaLatinFontPath: string
	uiModulePath: string
	rootSelector: string
	webSocketUrl: string
}) =>
	Layer.unwrap(
		Effect.gen(function* () {
			yield* loadAssets({
				comfortaaLatinExtFontPath,
				comfortaaLatinFontPath,
			})
			return Layer.mergeAll(
				rendererLayer(rootSelector),
				hotUiModuleLoaderLayer({
					modulePath: uiModulePath,
					cssLinkSelector,
				}).pipe(
					Layer.provide(Browser.BrowserSocket.layerWebSocket(webSocketUrl)),
				),
			)
		}),
	)
