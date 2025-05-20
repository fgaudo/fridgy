import { App as CAP } from '@capacitor/app'
import type { Cancel } from 'effect/Runtime'
import { onMount } from 'svelte'

import { D, Eff, Str, pipe } from '$lib/core/imports.ts'

import {
	createCapacitorListener,
	makeDispatcher,
	makeEffectRunner,
} from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'
import { createCrashHandler } from '$lib/ui/helpers.svelte.ts'

import * as Tasks from './commands.ts'
import { type ProductViewModel, createStateContext } from './state.svelte.ts'
import { Message, update } from './update.svelte.ts'

const refreshTimeIntervalFrequency = D.seconds(20)

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

	/** Refresh time listeners */
	{
		let cancelRefreshTimeInterval: Cancel<unknown, unknown> | undefined

		const refreshTimeInterval = pipe(
			Str.fromEffect(Tasks.refreshTime),
			Str.mapEffect(dispatch),
			Str.mapEffect(() => Eff.sleep(refreshTimeIntervalFrequency)),
			Str.forever,
		)

		$effect(() => {
			cancelRefreshTimeInterval?.()

			if (context.derived.refreshTimeListenersEnabled) {
				runner.runEffect(Eff.log(`Refresh time listeners enabled`))

				cancelRefreshTimeInterval = runner.runEffect(
					pipe(refreshTimeInterval, Str.runDrain),
				)
			} else {
				runner.runEffect(Eff.log(`Refresh time listeners disabled`))
			}
		})
	}

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
		},
	}
}
