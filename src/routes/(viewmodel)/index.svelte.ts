import { Duration, Ref, flow } from 'effect'
import type { Cancel } from 'effect/Runtime'

import { Eff } from '$lib/core/imports.ts'
import { createDispatcher } from '$lib/core/store.ts'

import {
	createCapacitorListener,
	createRunEffect,
} from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import * as Tasks from './commands.ts'
import {
	type ProductViewModel,
	createStateContext,
} from './state.svelte.ts'
import {
	Message,
	update,
} from './update.svelte.ts'

const refreshTimeIntervalFrequency =
	Duration.seconds(20)

export function createViewModel() {
	const context = createStateContext()

	const { runtime } = getGlobalContext()

	const runEffect = createRunEffect(runtime)

	const dispatchToEffect = createDispatcher(
		Ref.unsafeMake(context.state),
		update,
	)
	const dispatch = flow(
		(message: Message) => Eff.succeed(message),
		dispatchToEffect,
		runEffect,
	)

	const dispatchNoCancel: (
		...p: Parameters<typeof dispatch>
	) => void = dispatch

	{
		let cancelRefreshTimeResumeListener:
			| Cancel<unknown, unknown>
			| undefined

		let cancelRefreshTimeInterval:
			| Cancel<unknown, unknown>
			| undefined

		const startRefreshTimeResumeListener =
			createCapacitorListener({
				event: 'resume',
				cb: () =>
					dispatchNoCancel(Message.RefreshTime()),
			})

		const refreshTimeInterval = Eff.gen(
			function* () {
				while (true) {
					yield* dispatchToEffect(
						Tasks.refreshTime,
					)

					yield* Eff.sleep(
						refreshTimeIntervalFrequency,
					)
				}
			},
		)

		$effect(() => {
			cancelRefreshTimeResumeListener?.()
			cancelRefreshTimeInterval?.()

			if (
				context.derived
					.refreshTimeListenersEnabled
			) {
				cancelRefreshTimeResumeListener =
					startRefreshTimeResumeListener()

				cancelRefreshTimeInterval = runEffect(
					refreshTimeInterval,
				)
			}
		})
	}

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			disableSelectMode: () =>
				dispatchNoCancel(Message.ClearSelected()),

			fetchList: () =>
				dispatchNoCancel(Message.FetchList()),

			toggleMenu: () =>
				dispatchNoCancel(Message.ToggleMenu()),

			toggleItem: (product: ProductViewModel) =>
				dispatchNoCancel(
					Message.ToggleItem({ product }),
				),

			registerRefreshTimeListeners: () =>
				dispatchNoCancel(
					Message.EnableRefreshTimeListener(),
				),

			unregisterRefreshTimeListeners: () =>
				dispatchNoCancel(
					Message.DisableRefreshTimeListener(),
				),

			deleteSelected: () => {
				dispatchNoCancel(
					Message.DeleteSelectedAndRefresh(),
				)
			},
		},
	}
}
