import { Ref, flow } from 'effect'

import { Eff, pipe } from '$lib/core/imports.ts'

import {
	createDispatcherWithLogging,
	createRunEffect,
} from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import { createStateContext } from './state.svelte.ts'
import {
	Message,
	update,
} from './update.svelte.ts'

export function createViewModel() {
	const context = createStateContext()

	const dispatch = createDispatcherWithLogging(
		Ref.unsafeMake(context.state),
		update,
	)

	const { runtime } = getGlobalContext()

	const runEffect = createRunEffect(runtime)

	const unsafeDispatch = flow(dispatch, runEffect)

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			addProduct: () =>
				pipe(
					Eff.log(
						'Received addProduct event from the ui',
					),
					Eff.andThen(
						Eff.succeed(Message.AddProduct()),
					),
					unsafeDispatch,
				),
			setExpirationDate: (value: string) =>
				pipe(
					Eff.log(
						'Received setExpirationDate event from the ui with value ' +
							value,
					),
					Eff.andThen(
						Eff.succeed(
							Message.SetExpirationDate({
								expirationDate: value,
							}),
						),
					),
					unsafeDispatch,
				),

			setName: (name: string) =>
				pipe(
					Eff.log(
						'Received setName event from the ui with name ' +
							name,
					),
					Eff.andThen(
						Eff.succeed(
							Message.SetName({ name }),
						),
					),
					unsafeDispatch,
				),

			setNameInteracted: () =>
				pipe(
					Eff.log(
						'Received setNameInteracted event from the ui',
					),
					Eff.andThen(
						Message.SetNameInteracted(),
					),
					unsafeDispatch,
				),
		},
	}
}
