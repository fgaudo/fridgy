import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import * as Derived from './derived.ts'
import { Message } from './message.ts'
import * as State from './state.ts'
import { update } from './update.ts'

export const derivedInit = Derived.deriveInit(State.init)

const makeViewModel: Effect.Effect<
	ViewModel<Derived.Derived, Message, UC.All>
> = Effect.gen(function* () {
	const stateManager = yield* SM.makeStateManager({
		initState: State.init,
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

export { makeViewModel, Message }
