import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import * as Derived from './derived.ts'
import { Message } from './message.ts'
import * as Scheduler from './scheduler.ts'
import * as State from './state.ts'
import { update } from './update.ts'

const init = Derived.deriveInit(State.init)

const makeViewModel: Effect.Effect<
	ViewModel<Derived.Derived, Message, UC.All>
> = Effect.gen(function* () {
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
			Derived.derive(stateManager.dispatch),
		),
	}
})

export { makeViewModel, Message, init as derivedInit }
