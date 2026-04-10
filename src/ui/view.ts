import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { h } from 'snabbdom'

import * as Home from './home/view.ts'
import type { Message } from './messages.ts'
import type * as VM from './state.ts'

export const view = (
	model: VM.Model,
	{ dispatch }: { dispatch: (m: Message) => void },
) => {
	return h('div', [
		Match.valueTags(model.currentPage, {
			Home: ({ model }) => Home.view(model, { dispatch }),
			AddProduct: () =>
				h('div', { class: { 'text-2xl text-white': true } }, []),
		}),
		h('div', {
			key: model.toast.key,
			hook: {
				insert: () => {
					const maybeText = model.toast.maybeText
					if (Option.isSome(maybeText)) {
						void Toast.show({ text: maybeText.value })
					}
				},
			},
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
