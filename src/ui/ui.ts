import './css/styles.css'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'

import {
	MessageDispatcher,
	type Message,
} from '@/app/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/app/ports/inbound/model-emitter/model.ts'
import type { UiModule } from '@/app/ports/inbound/ui-module-emitter.ts'
import { HtmlView } from '@/app/ports/outbound/renderer.ts'

import { loadFonts } from './fonts/index.ts'
import * as Root from './pages/view.tsx'

export const makeUi: UiModule['makeUi'] = Effect.gen(function* () {
	const messageDispatcher = yield* MessageDispatcher
	const run = yield* FiberSet.makeRuntimePromise()
	const dispatch = (message: Message) => {
		void run(messageDispatcher(message))
	}
	yield* Effect.all(
		[loadFonts, Effect.promise(() => defineCustomElements(window))],
		{ concurrency: 'unbounded' },
	)
	return (model: Model) => HtmlView.set(Root.makeView(model, { dispatch }))
}).pipe(Effect.scoped)
