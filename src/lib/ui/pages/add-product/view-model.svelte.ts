import { Eff, pipe } from '$lib/core/imports.ts'

import { useCases } from '$lib/business/index.ts'
import {
	runEffect,
	toCallback,
} from '$lib/ui/utils.ts'

import { createStateContext } from './internal/state.svelte.ts'
import {
	StoreService,
	createStore,
} from './internal/store.ts'
import * as internalTasks from './internal/tasks.ts'

export function createViewModel() {
	const store = createStore(createStateContext())

	const queueResetToast = pipe(
		internalTasks.queueResetToast,
		Eff.provideService(StoreService, store),
		toCallback,
	)

	$effect(() => {
		if (store.context.derived.toastHasMessage) {
			queueResetToast()
		}
	})

	return {
		state: {
			isAdding: store.context.state.isAdding,
			isNameValidAndWasTouched:
				store.context.derived
					.isNameValidAndWasTouched,
			isSubmittable:
				store.context.derived.isSubmittable,
			name: store.context.state.name,
			maybeExpirationDate:
				store.context.derived.maybeExpirationDate,
			formattedExpirationDateOrEmpty:
				store.context.derived
					.formattedExpirationDateOrEmpty,
			formattedCurrentDate:
				store.context.derived
					.formattedCurrentDate,
			maybeToastMessage:
				store.context.derived.maybeToastMessage,
		},
		tasks: {
			addProduct: pipe(
				internalTasks.addProduct,
				Eff.provide(useCases),
				Eff.provideService(StoreService, store),
				toCallback,
			),

			setExpirationDate: (value: string) =>
				pipe(
					internalTasks.setExpirationDate(value),
					Eff.provideService(StoreService, store),
					runEffect,
				),

			setName: (name: string) =>
				pipe(
					internalTasks.setName(name),
					Eff.provideService(StoreService, store),
					runEffect,
				),
			setNameInteracted: pipe(
				internalTasks.setNameInteracted,
				Eff.provideService(StoreService, store),
				toCallback,
			),
		},
	}
}
