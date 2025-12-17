import * as Effect from 'effect/Effect'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { Message } from './message.ts'
import * as Model from './model.ts'
import * as State from './state.ts'
import * as Scheduler from './subscription.ts'
import { update } from './update.ts'

const init = Model.init(State.init)

const make: Effect.Effect<
	ViewModel<Model.Model, Message, UC.All>,
	never,
	Scope.Scope
> = Effect.gen(function* () {
	const stateManager = yield* SM.withSubscriptions(
		SM.makeStateManager(State.init, update, {
			fatalMessage: error => Message.Crash({ error }),
		}),
		Scheduler.evaluateSubscriptions,
		{ fatalMessage: error => Message.Crash({ error }) },
	)

	yield* stateManager.dispatch(Message.StartFetchList())

	return {
		...stateManager,
		stateChanges: Stream.map(
			stateManager.stateChanges,
			Model.make(stateManager.dispatch),
		),
	}
})

export { make, init }
