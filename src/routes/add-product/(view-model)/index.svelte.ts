import { Eff, pipe } from '$lib/core/imports.ts'

import { makeDispatcher, makeEffectRunner } from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'
import { createCrashHandler } from '$lib/ui/helpers.svelte.ts'

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
					Eff.log(`Received addProduct event from the ui`),
					Eff.andThen(dispatch(Message.AddProduct())),
					runner.runEffect,
				),
			setExpirationDate: (value: string) =>
				pipe(
					Eff.log(
						`Received setExpirationDate event from the ui with value ${value}`,
					),
					Eff.andThen(
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
					Eff.log(`Received setName event from the ui with name ${name}`),
					Eff.andThen(dispatch(Message.SetName({ name }))),
					runner.runEffect,
				),

			setNameInteracted: () =>
				pipe(
					Eff.log(`Received setNameInteracted event from the ui`),
					Eff.andThen(dispatch(Message.SetNameInteracted())),
					runner.runEffect,
				),

			showCrash: () => {
				pipe(
					Eff.log(`Received showCrash event from the ui`),
					Eff.andThen(dispatch(Message.ShowCrash())),
					runner.runEffect,
				)
			},
		},
	}
}
