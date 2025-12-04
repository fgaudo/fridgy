import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { Message } from './message.ts'
import * as Model from './model.ts'
import * as Scheduler from './scheduler.ts'
import * as State from './state.ts'
import { update } from './update.ts'

const init = Model.init(State.init)

const make: Effect.Effect<ViewModel<Model.Model, Message, UC.All>> = Effect.gen(
	function* () {
		const stateManager = yield* SM.makeStateManager({
			subscriptions: [Scheduler.fetchListScheduler],
			initState: State.init,
			initMessages: [Message.StartFetchList()],
			fatalMessage: error => Message.Crash({ error }),
			fatalMessageSubscription: error => Message.Crash({ error }),
			update,
		})

		return {
			...stateManager,
			stateChanges: Stream.map(
				stateManager.stateChanges,
				Model.make(stateManager.dispatch),
			),
		}
	},
)

export { make, init }
