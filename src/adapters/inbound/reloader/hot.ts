import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as Socket from 'effect/unstable/socket'

import { Reloader } from '../../../ports/inbound/reloader'

export const HotModuleReloader = Layer.effect(
	Reloader,
	Effect.gen(function* () {
		const initialView = yield* loadView
		const view = yield* SubscriptionRef.make(initialView)
		const socket = yield* Socket.Socket

		const loadView = Effect.gen(function* () {
			const millis = yield* Clock.currentTimeMillis
			const { view } = yield* Effect.promise(
				() => import(`./view.js?t=${millis}`),
			)
			return view
		})

		const refreshCss = Effect.gen(function* () {
			const millis = yield* Clock.currentTimeMillis
			const href = yield* Effect.sync(() => css.getAttribute('href')!)
			const url = new URL(href, window.location.origin)
			url.searchParams.set('t', millis.toString())
			yield* Effect.sync(() => css.setAttribute('href', url.toString()))
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

		return { changes: SubscriptionRef.changes(view) }
	}),
)
