import { App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Stream from 'effect/Stream'
import { onMount } from 'svelte'

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
			Stream.runForEach(() =>
				Effect.gen(function* () {
					if (context.state.isMenuOpen) {
						return yield* dispatch(Message.ToggleMenu())
					}

					if (context.derived.hasSelectedProducts) {
						return yield* dispatch(Message.ClearSelected())
					}

					return yield* Effect.promise(() => CAP.exitApp())
				}),
			),
			runner.runEffect,
		)

		pipe(
			createCapacitorListener(`resume`),
			Stream.runForEach(() => dispatch(Message.StartRefreshTime())),
			runner.runEffect,
		)
	})

	effectToStream({
		refreshTimeListenersEnabled: () =>
			context.derived.refreshTimeListenersEnabled,
	}).pipe(
		Stream.flatMap(
			({ refreshTimeListenersEnabled }) =>
				refreshTimeListenersEnabled ? refreshTimeInterval : Stream.empty,
			{ switch: true },
		),
		Stream.runForEach(dispatch),
		runner.runEffect,
	)

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			refreshList: () => {
				pipe(
					Effect.log(`UI triggered refreshList`),
					Effect.andThen(dispatch(Message.FetchList())),
					runner.runEffect,
				)
			},
			clearSelected: () =>
				pipe(
					Effect.log(`UI triggered clearSelected`),
					Effect.andThen(dispatch(Message.ClearSelected())),
					runner.runEffect,
				),

			toggleItem: (product: ProductViewModel) =>
				pipe(
					Effect.log(`UI triggered toggleItem`),
					Effect.andThen(dispatch(Message.ToggleItem({ product }))),
					runner.runEffect,
				),

			toggleMenu: () =>
				pipe(
					Effect.log(`UI triggered toggleMenu`),
					Effect.andThen(dispatch(Message.ToggleMenu())),
					runner.runEffect,
				),

			deleteSelected: () =>
				pipe(
					Effect.log(`UI triggered deleteSelected`),
					Effect.andThen(dispatch(Message.StartDeleteSelectedAndRefresh())),
					runner.runEffect,
				),
		},
	}
}
