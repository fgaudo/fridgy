import * as Browser from '@effect/platform-browser'
import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as Socket from 'effect/unstable/socket'

import {
	UiModuleEmitter,
	type UiModule,
} from '@/app/ports/ui-module-emitter.ts'
import { safeImport } from '@/shared/safe.ts'

export const noop = (path: string) =>
	Layer.effect(
		UiModuleEmitter,
		Effect.gen(function* () {
			const module = (yield* safeImport(path)) as UiModule
			return Stream.make(module)
		}),
	)

export const hot = ({
	modulePath,
	cssLinkSelector,
	webSocketUrl,
}: {
	modulePath: string
	cssLinkSelector: string
	webSocketUrl: string
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
	).pipe(Layer.provide(Browser.BrowserSocket.layerWebSocket(webSocketUrl)))
