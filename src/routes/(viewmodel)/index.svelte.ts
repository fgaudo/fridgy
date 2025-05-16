import type { Cancel } from 'effect/Runtime'

import { D, Eff, pipe } from '$lib/core/imports.ts'

import {
	createCapacitorListener,
	makeDispatcher,
	makeEffectRunner,
} from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import * as Tasks from './commands.ts'
import { type ProductViewModel, createStateContext } from './state.svelte.ts'
import { Message, update } from './update.svelte.ts'

const refreshTimeIntervalFrequency = D.seconds(20)

export function createViewModel() {
	const context = createStateContext()

	const { runtime } = getGlobalContext()
	const runner = makeEffectRunner(runtime)

	const { dispatch } = makeDispatcher(context.state, runner, update)

	/** Refresh time listeners */
	{
		let cancelRefreshTimeResumeListener: Cancel<unknown, unknown> | undefined

		let cancelRefreshTimeInterval: Cancel<unknown, unknown> | undefined

		const startRefreshTimeResumeListener = createCapacitorListener({
			event: `resume`,
			cb: () => {
				runner.runEffect(dispatch(Message.RefreshTime()))
			},
		})

		const refreshTimeInterval = Eff.gen(function* () {
			while (true) {
				const m = yield* Tasks.refreshTime
				yield* dispatch(m)
				yield* Eff.sleep(refreshTimeIntervalFrequency)
			}
		})

		$effect(() => {
			cancelRefreshTimeResumeListener?.()
			cancelRefreshTimeInterval?.()

			if (context.derived.refreshTimeListenersEnabled) {
				runner.runEffect(Eff.log(`Refresh time listeners enabled`))
				cancelRefreshTimeResumeListener = startRefreshTimeResumeListener()

				cancelRefreshTimeInterval = runner.runEffect(refreshTimeInterval)
			} else {
				runner.runEffect(Eff.log(`Refresh time listeners disabled`))
			}
		})
	}

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			clearSelected: () => dispatch(Message.ClearSelected()),

			fetchList: () =>
				pipe(
					Eff.log(`Received fetchList event from the ui`),
					Eff.andThen(dispatch(Message.FetchList())),
					runner.runEffect,
				),

			toggleMenu: () =>
				pipe(
					Eff.log(`Received toggleMenu event from the ui`),
					Eff.andThen(dispatch(Message.ToggleMenu())),
					runner.runEffect,
				),

			toggleItem: (product: ProductViewModel) =>
				pipe(
					Eff.log(`Received toggleItem event from the ui`),
					Eff.andThen(dispatch(Message.ToggleItem({ product }))),
					runner.runEffect,
				),

			registerRefreshTimeListeners: () =>
				pipe(
					Eff.log(`Received registerRefreshTimeListeners event from the ui`),
					Eff.andThen(dispatch(Message.EnableRefreshTimeListener())),
					runner.runEffect,
				),

			unregisterRefreshTimeListeners: () =>
				pipe(
					Eff.log(`Received unregisterRefreshTimeListeners event from the ui`),
					Eff.andThen(dispatch(Message.DisableRefreshTimeListener())),
					runner.runEffect,
				),

			deleteSelected: () =>
				pipe(
					Eff.log(`Received deleteSelected event from the ui`),
					Eff.andThen(dispatch(Message.DeleteSelectedAndRefresh())),
					runner.runEffect,
				),
		},
	}
}
