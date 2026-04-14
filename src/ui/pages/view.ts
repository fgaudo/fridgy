import '../css/styles.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { h } from 'snabbdom'

import type { Module } from '@/ports/inbound/ui-module-emitter.ts'

import { loadFonts } from '../fonts/index.ts'
import * as Home from './home/view.ts'

export const view: Module['view'] = (model, { dispatch }) => {
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
					Promise.all([loadFonts(), defineCustomElements(window)]).then(() =>
						SplashScreen.hide(),
					)
				},
			},
		}),
	])
}
