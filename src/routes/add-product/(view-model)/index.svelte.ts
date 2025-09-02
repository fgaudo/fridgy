import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'

import { makeEffectRunner } from '$lib/ui/adapters.svelte.ts'
import { getGlobalContext } from '$lib/ui/context.ts'
import { createCrashHandler, makeDispatcher } from '$lib/ui/helpers.svelte.ts'

import { createStateContext } from './state.svelte.ts'
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

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			addProduct: () =>
				pipe(
					Effect.log(`Received addProduct event from the ui`),
					Effect.andThen(dispatch(Message.AddProduct())),
					runner.runEffect,
				),
			setExpirationDate: (value: string) =>
				pipe(
					Effect.log(
						`Received setExpirationDate event from the ui with value ${value}`,
					),
					Effect.andThen(
						dispatch(
							Message.SetExpirationDate({
								expirationDate: value,
							}),
						),
					),
					runner.runEffect,
				),

			setName: (name: string) =>
				pipe(
					Effect.log(`Received setName event from the ui with name ${name}`),
					Effect.andThen(dispatch(Message.SetName({ name }))),
					runner.runEffect,
				),

			setNameInteracted: () =>
				pipe(
					Effect.log(`Received setNameInteracted event from the ui`),
					Effect.andThen(dispatch(Message.SetNameInteracted())),
					runner.runEffect,
				),

			showCrash: () => {
				pipe(
					Effect.log(`Received showCrash event from the ui`),
					Effect.andThen(dispatch(Message.ShowCrash())),
					runner.runEffect,
				)
			},
		},
	}
}
