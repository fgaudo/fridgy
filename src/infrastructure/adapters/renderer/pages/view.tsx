import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type { Model } from '@/app/model/root.ts'
import { UiService } from '@/infra/adapters/renderer/ui-service.ts'

import * as Home from './home/view.tsx'

export const makeView = Effect.gen(function* () {
	const run = yield* FiberSet.makeRuntime()
	const homeView = yield* Home.makeView
	const { hideSplashScreen } = yield* UiService
	return (model: Model) => {
		return h('div', [
			Match.valueTags(model.currentPage, {
				Home: ({ model }) => homeView(model),
				AddProduct: () =>
					h('div', { class: { 'text-2xl text-white': true } }, []),
			}),
			h('div', {
				key: 'static',
				hook: {
					insert: () => {
						run(hideSplashScreen)
					},
				},
			}),
		])
	}
}).pipe(Effect.scoped)
