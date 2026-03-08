import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCases as UC } from '@/business/index.ts'

import { Message } from './message.ts'
import * as Model from './model.ts'
import * as State from './state.ts'
import { update } from './update.ts'

const viewModel: ViewModel<Model.Model, Message, UC.All> = {
	init: Model.make(State.init),
	make: Effect.gen(function* () {
		const stateManager = yield* SM.make(State.init, update)

		return {
			...stateManager,
			stateChanges: Stream.map(stateManager.stateChanges, Model.make),
		}
	}),
}

export { viewModel }
