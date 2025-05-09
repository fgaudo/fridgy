import { Ref } from 'effect'

import { pipe } from '$lib/core/imports.ts'
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
		actions: {
			addProduct: () =>
				pipe(
					dispatch(Message.AddProduct()),
					runEffect,
				),
			setExpirationDate: (value: string) =>
				pipe(
					dispatch(
						Message.SetExpirationDate({
							expirationDate: value,
						}),
					),
					runEffect,
				),

			setName: (name: string) =>
				pipe(
					dispatch(Message.SetName({ name })),
					runEffect,
				),

			setNameInteracted: () =>
				pipe(
					dispatch(Message.SetNameInteracted()),
					runEffect,
				),
		},
	}
}
