import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'

import {
	MessageDispatcher,
	type Message,
} from '@/app/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/app/ports/inbound/model-emitter/model.ts'
import type { UiModule } from '@/app/ports/inbound/ui-module-emitter.ts'
import { View } from '@/app/ports/outbound/renderer.ts'

import * as Root from './pages/view.tsx'

export const makeUi: UiModule['makeUi'] = Effect.gen(function* () {
	const messageDispatcher = yield* MessageDispatcher
	const run = yield* FiberSet.makeRuntimePromise()
	const dispatch = (message: Message) => {
		void run(messageDispatcher(message))
	}
	return (model: Model) => View.set(Root.makeView(model, { dispatch }))
}).pipe(Effect.scoped)
