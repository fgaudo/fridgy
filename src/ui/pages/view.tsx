import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type { Message } from '@/app/ports/state-manager/message-dispatcher.ts'
import type { Model } from '@/app/ports/state-manager/model-emitter/pages/model.ts'
import { SplashScreenService } from '@/app/ports/ui/splashscreen-service.ts'

import * as Home from './home/view.tsx'

export const makeView = Effect.gen(function* () {
	const run = yield* FiberSet.makeRuntime()
	const splashScreen = yield* SplashScreenService
	const homeView = yield* Home.makeView
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
						run(splashScreen.hide)
					},
				},
			}),
		])
	}
}).pipe(Effect.scoped)
