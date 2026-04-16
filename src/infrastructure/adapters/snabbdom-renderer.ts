import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Snabbdom from 'snabbdom'

import { HtmlView, Renderer } from '@/app/ports/outbound/renderer.ts'

export const layer = Layer.effect(
	Renderer,
	Effect.gen(function* () {
		const rootSelector = yield* Config.string('ROOT_ELEMENT_SELECTOR')
		const root = yield* Effect.sync(() => document.querySelector(rootSelector)!)
		const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
			root,
		)
		const patch = Snabbdom.init([
			Snabbdom.classModule,
			Snabbdom.propsModule,
			Snabbdom.styleModule,
			Snabbdom.attributesModule,
			Snabbdom.eventListenersModule,
		])
		return view =>
			SynchronizedRef.updateEffect(containerRef, node =>
				Effect.sync(() => patch(node, HtmlView.get(view) as Snabbdom.VNode)),
			)
	}),
).pipe(Layer.orDie)
