import type { ViewModel } from '$lib/core.ts'

import type { UseCases } from '../../business/app/use-cases.ts'
import { makeStateManager } from '../../core/state-manager.ts'
import type { State } from './state.ts'
import { InternalMessage, Message, update } from './update.ts'

const initState = {} as State

export const viewModel: ViewModel<State, Message, UseCases> = {
	initState,
	run: makeStateManager({
		initState,
		update,
		fatalMessage: err => InternalMessage.Crash({ message: err }),
	}),
}
