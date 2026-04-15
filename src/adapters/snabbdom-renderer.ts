import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

import { Renderer } from '@/ports/outbound/renderer.ts'

export const layer = (root: Element) =>
	Layer.effect(
		Renderer,
		Effect.gen(function* () {
			const containerRef = yield* SynchronizedRef.make<
				Element | Snabbdom.VNode
			>(root)

			const patch = Snabbdom.init([
				Snabbdom.classModule,
				Snabbdom.propsModule,
				Snabbdom.styleModule,
				Snabbdom.eventListenersModule,
			])

			return view =>
				SynchronizedRef.updateEffect(containerRef, node =>
					Effect.sync(() => patch(node, view)),
				)
		}),
	)
