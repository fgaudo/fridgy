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
		state: store.context.state,
		derived: store.context.derived,
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
			initNameIfNotSet: pipe(
				internalTasks.initNameIfNotSet,
				Eff.provideService(StoreService, store),
				toCallback,
			),
		},
	}
}
