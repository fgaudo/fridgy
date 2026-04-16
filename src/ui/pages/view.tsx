import { SplashScreen } from '@capacitor/splash-screen'
import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type { Message } from '@/app/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/app/ports/inbound/model-emitter/model.ts'

import * as Home from './home/view.tsx'

export const makeView = (
	model: Model,
	{ dispatch }: { dispatch: (m: Message) => void },
) => {
	return h('div', [
		Match.valueTags(model.currentPage, {
			Home: ({ model }) => Home.makeView(model, { dispatch }),
			AddProduct: () =>
				h('div', { class: { 'text-2xl text-white': true } }, []),
		}),
		h('div', {
			key: 'static',
			hook: {
				insert: () => {
					void SplashScreen.hide()
				},
			},
		}),
	])
}
