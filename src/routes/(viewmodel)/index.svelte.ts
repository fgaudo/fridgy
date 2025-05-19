import { Eff, NEHS, pipe } from '$lib/core/imports.ts'

import { makeDispatcher, makeEffectRunner } from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import { createStateContext } from './state.svelte.ts'
import { Message, update } from './update.svelte.ts'

export function createViewModel() {
	const context = createStateContext()

	const { runtime } = getGlobalContext()
	const runner = makeEffectRunner(runtime)

	const { dispatch } = makeDispatcher(context.state, runner, update, err =>
		Message.Crash({ message: err }),
	)

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			refreshList: () => {
				pipe(
					Eff.log(`UI triggered refreshList`),
					Eff.andThen(dispatch(Message.FetchList())),
					runner.runEffect,
				)
			},

			deleteProducts: (ids: NEHS.NonEmptyHashSet<string>) =>
				pipe(
					Eff.log(`UI triggered deleteSelected`),
					Eff.andThen(dispatch(Message.StartDeleteSelectedAndRefresh({ ids }))),
					runner.runEffect,
				),
		},
	}
}
