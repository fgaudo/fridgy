import type { Cancel } from 'effect/Runtime'
import { onMount } from 'svelte'

import { D, Eff, Str, pipe } from '$lib/core/imports.ts'

import { makeDispatcher, makeEffectRunner } from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import * as Tasks from './commands.ts'
import { type ProductViewModel, createStateContext } from './state.svelte.ts'
import { Message, update } from './update.svelte.ts'

const refreshTimeIntervalFrequency = D.seconds(20)

export function createViewModel() {
	const context = createStateContext()

	const { runtime } = getGlobalContext()
	const runner = makeEffectRunner(runtime)

	const { dispatch } = makeDispatcher(context, runner, update)

	onMount(() => {
		runner.runEffect(dispatch(Message.FetchList()))
	})

	$effect(() => {
		if (context.state.refreshTimeTask !== undefined) {
		}
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
			pageResumed: () =>
				pipe(
					Eff.log(`UI triggered pageResumed`),
					Eff.andThen(dispatch(Message.RefreshTime())),
					runner.runEffect,
				),
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

			deleteSelected: () =>
				pipe(
					Eff.log(`UI triggered deleteSelected`),
					Eff.andThen(dispatch(Message.DeleteSelectedAndRefresh())),
					runner.runEffect,
				),
		},
	}
}
