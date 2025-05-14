import type { Cancel } from 'effect/Runtime'

import { D, Eff, Ref, flow, pipe } from '$lib/core/imports.ts'

import {
	createCapacitorListener,
	createDispatcherWithLogging,
	createRunEffect,
} from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import * as Tasks from './commands.ts'
import { type ProductViewModel, createStateContext } from './state.svelte.ts'
import { Message, update } from './update.svelte.ts'

const refreshTimeIntervalFrequency = D.seconds(20)

export function createViewModel() {
	const context = createStateContext()

	const { runtime } = getGlobalContext()

	const runEffect = createRunEffect(runtime)

	const dispatch = createDispatcherWithLogging(
		Ref.unsafeMake(context.state),
		update,
	)

	const unsafeDispatch = flow(dispatch, runEffect)

	/** Refresh time listeners */
	{
		let cancelRefreshTimeResumeListener: Cancel<unknown, unknown> | undefined

		let cancelRefreshTimeInterval: Cancel<unknown, unknown> | undefined

		const startRefreshTimeResumeListener = createCapacitorListener({
			event: `resume`,
			cb: () => unsafeDispatch(Eff.succeed(Message.RefreshTime())),
		})

		const refreshTimeInterval = Eff.gen(function* () {
			while (true) {
				yield* dispatch(Tasks.refreshTime)

				yield* Eff.sleep(refreshTimeIntervalFrequency)
			}
		})

		$effect(() => {
			cancelRefreshTimeResumeListener?.()
			cancelRefreshTimeInterval?.()

			if (context.derived.refreshTimeListenersEnabled) {
				runEffect(Eff.log(`Refresh time listeners enabled`))
				cancelRefreshTimeResumeListener = startRefreshTimeResumeListener()

				cancelRefreshTimeInterval = runEffect(refreshTimeInterval)
			} else {
				runEffect(Eff.log(`Refresh time listeners disabled`))
			}
		})
	}

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			clearSelected: () =>
				pipe(
					Eff.log(`Received clearSelected event from the ui`),
					Eff.andThen(Eff.succeed(Message.ClearSelected())),
					unsafeDispatch,
				),

			fetchList: () =>
				pipe(
					Eff.log(`Received fetchList event from the ui`),
					Eff.andThen(Eff.succeed(Message.FetchList())),
					unsafeDispatch,
				),

			toggleMenu: () =>
				pipe(
					Eff.log(`Received toggleMenu event from the ui`),
					Eff.andThen(Eff.succeed(Message.ToggleMenu())),
					unsafeDispatch,
				),

			toggleItem: (product: ProductViewModel) =>
				pipe(
					Eff.log(`Received toggleItem event from the ui`),
					Eff.andThen(Eff.succeed(Message.ToggleItem({ product }))),
					unsafeDispatch,
				),

			registerRefreshTimeListeners: () =>
				pipe(
					Eff.log(`Received registerRefreshTimeListeners event from the ui`),
					Eff.andThen(Eff.succeed(Message.EnableRefreshTimeListener())),
					unsafeDispatch,
				),

			unregisterRefreshTimeListeners: () =>
				pipe(
					Eff.log(`Received unregisterRefreshTimeListeners event from the ui`),
					Eff.andThen(Eff.succeed(Message.DisableRefreshTimeListener())),
					unsafeDispatch,
				),

			deleteSelected: () =>
				pipe(
					Eff.log(`Received deleteSelected event from the ui`),
					Eff.andThen(Eff.succeed(Message.DeleteSelectedAndRefresh())),
					unsafeDispatch,
				),
		},
	}
}
