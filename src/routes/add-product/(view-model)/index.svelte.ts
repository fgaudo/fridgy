import { Ref } from 'effect'

import { Eff, pipe } from '$lib/core/imports.ts'
import { createDispatcher } from '$lib/core/store.ts'

import {
	toCallback,
	toCallbackWithParam,
} from '$lib/ui/adapters.ts'

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

	return {
		state: context.state,
		derived: context.derived,
		actions: {
			addProduct: pipe(
				dispatch(Message.AddProduct()),
				Eff.provide(context.service),
				toCallback,
			),
			setExpirationDate: toCallbackWithParam(
				(value: string) =>
					pipe(
						dispatch(
							Message.SetExpirationDate({
								expirationDate: value,
							}),
						),
						Eff.provide(context.service),
					),
			),
			setName: toCallbackWithParam(
				(name: string) =>
					pipe(
						dispatch(Message.SetName({ name })),
						Eff.provide(context.service),
					),
			),
			setNameInteracted: pipe(
				dispatch(Message.SetNameInteracted()),
				Eff.provide(context.service),
				toCallback,
			),
		},
	}
}
