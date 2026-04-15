import './css/styles.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { h } from 'snabbdom'

import {
	MessageDispatcher,
	type Message,
} from '@/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/ports/inbound/model-emitter/model.ts'
import type { UiModule } from '@/ports/inbound/ui-module-emitter.ts'
import { HtmlView } from '@/ports/outbound/renderer.ts'

import { loadFonts } from './fonts/index.ts'
import * as Home from './pages/home/view.ts'

export const makeUi: UiModule['makeUi'] = Effect.gen(function* () {
	const messageDispatcher = yield* MessageDispatcher
	const run = yield* FiberSet.makeRuntimePromise()
	const dispatch = (message: Message) => {
		void run(messageDispatcher(message))
	}
	return (model: Model) =>
		HtmlView.set(
			h('div', [
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
				h('div', '1asd33ads33dsa3sa3dd3d35a55'),
				h('div', {
					key: 'static',
					hook: {
						insert: () => {
							Promise.all([loadFonts(), defineCustomElements(window)]).then(
								() => SplashScreen.hide(),
							)
						},
					},
				}),
			]),
		)
}).pipe(Effect.scoped)
