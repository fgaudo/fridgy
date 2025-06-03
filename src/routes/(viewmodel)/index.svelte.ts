import { App as CAP } from '@capacitor/app'
import { onMount } from 'svelte'

import { Eff, Str, pipe } from '$lib/core/imports.ts'

import {
	createCapacitorListener,
	effectToStream,
	makeEffectRunner,
} from '$lib/ui/adapters.svelte.ts'
import { getGlobalContext } from '$lib/ui/context.ts'
import { createCrashHandler, makeDispatcher } from '$lib/ui/helpers.svelte.ts'

import { type ProductViewModel, createStateContext } from './state.svelte.ts'
import { refreshTimeInterval } from './subs.ts'
import { Message, update } from './update.svelte.ts'

export function createViewModel() {
	const context = createStateContext()

	const { runtime } = getGlobalContext()
	const runner = makeEffectRunner(runtime)

	const { dispatch } = makeDispatcher(context.state, runner, update, err =>
		Message.Crash({ message: err }),
	)

	createCrashHandler(
		() => context.state.hasCrashOccurred,
		runner,
		dispatch(Message.ShowCrash()),
	)

	onMount(() => {
		runner.runEffect(dispatch(Message.FetchList()))

		pipe(
			createCapacitorListener(`backButton`),
			Str.runForEach(() =>
				Eff.gen(function* () {
					if (context.state.isMenuOpen) {
						return yield* dispatch(Message.ToggleMenu())
					}

					if (context.derived.hasSelectedProducts) {
						return yield* dispatch(Message.ClearSelected())
					}

					return yield* Eff.promise(() => CAP.exitApp())
				}),
			),
			runner.runEffect,
		)

		pipe(
			createCapacitorListener(`resume`),
			Str.runForEach(() => dispatch(Message.StartRefreshTime())),
			runner.runEffect,
		)
	})

	effectToStream({
		refreshTimeListenersEnabled: () =>
			context.derived.refreshTimeListenersEnabled,
	}).pipe(
		Str.flatMap(
			({ refreshTimeListenersEnabled }) =>
				refreshTimeListenersEnabled ? refreshTimeInterval : Str.empty,
			{ switch: true },
		),
		Str.runForEach(dispatch),
		runner.runEffect,
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
			clearSelected: () =>
				pipe(
					Eff.log(`UI triggered clearSelected`),
					Eff.andThen(dispatch(Message.ClearSelected())),
					runner.runEffect,
				),

			toggleItem: (product: ProductViewModel) =>
				pipe(
					Eff.log(`UI triggered toggleItem`),
					Eff.andThen(dispatch(Message.ToggleItem({ product }))),
					runner.runEffect,
				),

			toggleMenu: () =>
				pipe(
					Eff.log(`UI triggered toggleMenu`),
					Eff.andThen(dispatch(Message.ToggleMenu())),
					runner.runEffect,
				),

			deleteSelected: () =>
				pipe(
					Eff.log(`UI triggered deleteSelected`),
					Eff.andThen(dispatch(Message.StartDeleteSelectedAndRefresh())),
					runner.runEffect,
				),
			changeCompartment: (compartment: `fridge` | `freezer` | `other`) =>
				pipe(
					Eff.log(`UI triggered changeCompartment`),
					Eff.andThen(
						dispatch(Message.ChangeCompartment({ type: compartment })),
					),
					runner.runEffect,
				),
		},
	}
}
