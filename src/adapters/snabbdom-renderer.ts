import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

import { Renderer } from '@/ports/outbound/renderer.ts'

export const snabbdomRendererLayer = (root: Element) =>
	Layer.effect(
		Renderer,
		Effect.gen(function* () {
			const containerRef = yield* SynchronizedRef.make<
				Element | Snabbdom.VNode
			>(root)

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

			return view => SynchronizedRef.updateEffect(containerRef, patch(view))
		}),
	)
