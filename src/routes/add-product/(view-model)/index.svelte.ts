import { Ref } from 'effect'

import { Eff, pipe } from '$lib/core/imports.ts'
import { createDispatcher } from '$lib/core/store.ts'

import { useCases } from '$lib/business/index.ts'
import { createRuntime } from '$lib/ui/adapters.ts'

import { createStateContext } from './state.svelte.ts'
import {
	Message,
	update,
} from './update.svelte.ts'

export function createViewModel() {
	const context = createStateContext()

	const runEffect = createRuntime(useCases)

	const dispatch = createDispatcher(
		Ref.unsafeMake(context.state),
		update,
	)

	return {
		state: context.state,
		derived: context.derived,
		actions: {
			addProduct: () =>
				pipe(
					dispatch(Message.AddProduct()),
					Eff.provide(context.service),
					runEffect,
				),
			setExpirationDate: (value: string) =>
				pipe(
					dispatch(
						Message.SetExpirationDate({
							expirationDate: value,
						}),
					),
					Eff.provide(context.service),
					runEffect,
				),

			setName: (name: string) =>
				pipe(
					dispatch(Message.SetName({ name })),
					Eff.provide(context.service),
					runEffect,
				),

			setNameInteracted: () =>
				pipe(
					dispatch(Message.SetNameInteracted()),
					Eff.provide(context.service),
					runEffect,
				),
		},
	}
}
