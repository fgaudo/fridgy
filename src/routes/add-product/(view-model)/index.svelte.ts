import {
	Eff,
	O,
	pipe,
} from '$lib/core/imports.ts'

import {
	toCallback,
	toCallbackWithParam,
} from '$lib/ui/adapters.ts'

import * as Tasks from './actions.ts'
import { createStateContext } from './state.svelte.ts'
import * as Store from './store.svelte.ts'

export function createViewModel() {
	const context = createStateContext()

	const storeService = Store.createStoreService(
		context.state,
	)

	const queueCancelToast = pipe(
		Tasks.queueCancelToast,
		Eff.provide(storeService),
		toCallback,
	)

	$effect(() => {
		if (
			O.isSome(context.derived.maybeToastMessage)
		) {
			queueCancelToast()
		}
	})

	return {
		state: context.state,
		derived: context.derived,
		actions: {
			addProduct: pipe(
				Tasks.addProduct,
				Eff.provide(storeService),

				toCallback,
			),
			setExpirationDate: toCallbackWithParam(
				(value: string) =>
					pipe(
						Tasks.setExpirationDate(value),
						Eff.provide(storeService),
					),
			),
			setName: toCallbackWithParam(
				(name: string) =>
					pipe(
						Tasks.setName(name),
						Eff.provide(storeService),
					),
			),
			setNameInteracted: pipe(
				Tasks.setNameInteracted,
				Eff.provide(storeService),
				toCallback,
			),
		},
	}
}
