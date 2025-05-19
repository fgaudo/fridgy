import { SvelteSet } from 'svelte/reactivity'

import { O, pipe, Str } from '$lib/core/imports.ts'

import { createViewModel } from '../(viewmodel)/index.svelte.ts'
import { getGlobalContext } from '$lib/ui/context.ts'
import { makeDispatcher, makeEffectRunner } from '$lib/ui/adapters.ts'
import { refreshTime } from './commands.ts'

type State = {
	receivedError: boolean
	currentTimestamp: number
	isMenuOpen: boolean
	spinnerTaskId: symbol | undefined
	hasCrashOccurred: boolean
	toastMessage:
		| { id: symbol; message: string; type: `error` | `success` }
		| undefined
	isLoading: boolean
	selected: SvelteSet<string>
}

export function createUiState() {


	/** Refresh time listeners */
	{
		let cancelRefreshTimeInterval: Cancel<unknown, unknown> | undefined

		const refreshTimeInterval = pipe(
			Str.fromEffect(refreshTime),
			Str.mapEffect(() => dispatch(Message.StartRefreshTime())),
			Str.mapEffect(() => Eff.sleep(`20 seconds`)),
			Str.forever,
		)

		$effect(() => {
			cancelRefreshTimeInterval?.()

			if (refreshTimeListenersEnabled) {
				runner.runEffect(Eff.log(`Refresh time listeners enabled`))

				cancelRefreshTimeInterval = runner.runEffect(
					pipe(refreshTimeInterval, Str.runDrain),
				)
			} else {
				runner.runEffect(Eff.log(`Refresh time listeners disabled`))
			}
		})
	}

	const hasSelectedProducts = $derived(state.selected.size > 0)

	const maybeToastMessage = $derived(O.fromNullable(state.toastMessage))

	const { runtime } = getGlobalContext()
	const runner = makeEffectRunner(runtime)

	const { dispatch } = makeDispatcher(
		{ state, viewModel: uiState },
		runner,
		update,
		err => Message.Crash({ message: err }),
	)


	return {
		state,
		derived: {
			get maybeNonEmptySelected() {
				return maybeNonEmptySelected
			},
			get refreshTimeListenersEnabled() {
				return refreshTimeListenersEnabled
			},
		},
		tasks: {
			...viewModel.tasks,

			clearSelected(): {

			}
		},
	}
}
