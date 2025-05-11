import { Ref } from 'effect'

import { Eff, pipe } from '$lib/core/imports.ts'
import { createDispatcher } from '$lib/core/store.ts'

import { createRunEffect } from '$lib/ui/adapters.ts'
import { getGlobalContext } from '$lib/ui/context.ts'

import { createStateContext } from './state.svelte.ts'
import {
	Message,
	update,
} from './update.svelte.ts'

export function createViewModel() {
	const context = createStateContext()

	const dispatch = createDispatcher(
		Ref.unsafeMake(context.state),
		update,
	)

	const { runtime } = getGlobalContext()

	const runEffect = createRunEffect(runtime)

	return {
		state: context.state,
		derived: context.derived,
		tasks: {
			addProduct: () =>
				pipe(
					dispatch(
						Eff.succeed(Message.AddProduct()),
					),
					runEffect,
				),
			setExpirationDate: (value: string) =>
				pipe(
					dispatch(
						Eff.succeed(
							Message.SetExpirationDate({
								expirationDate: value,
							}),
						),
					),
					runEffect,
				),

			setName: (name: string) =>
				pipe(
					dispatch(
						Eff.succeed(
							Message.SetName({ name }),
						),
					),
					runEffect,
				),

			setNameInteracted: () =>
				pipe(
					dispatch(
						Eff.succeed(
							Message.SetNameInteracted(),
						),
					),
					runEffect,
				),
		},
	}
}
