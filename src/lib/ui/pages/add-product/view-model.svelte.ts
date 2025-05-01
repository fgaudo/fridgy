import {
	Eff,
	O,
	pipe,
} from '$lib/core/imports.ts'

import { useCases } from '$lib/business/index.ts'
import { toCallback } from '$lib/ui/utils.ts'

import * as Store from './internal/store.ts'
import * as Tasks from './internal/tasks.ts'

export function createViewModel() {
	const store = Store.createStore()

	const queueResetToast = pipe(
		Tasks.queueResetToast,
		Eff.provideService(Store.Service, store),
		toCallback,
	)

	$effect(() => {
		if (
			O.isSome(
				store.context.derived.maybeToastMessage,
			)
		) {
			queueResetToast()
		}
	})

	return {
		state: {
			get isAdding() {
				return store.context.state.isAdding
			},
			get isNameValidOrUntouched() {
				return store.context.derived
					.isNameValidOrUntouched
			},
			get isSubmittable() {
				return store.context.derived.isSubmittable
			},
			get name() {
				return store.context.state.name
			},
			get maybeExpirationDate() {
				return store.context.derived
					.maybeExpirationDate
			},
			get formattedExpirationDateOrEmpty() {
				return store.context.derived
					.formattedExpirationDateOrEmpty
			},
			get formattedCurrentDate() {
				return store.context.derived
					.formattedCurrentDate
			},
			get maybeToastMessage() {
				return store.context.derived
					.maybeToastMessage
			},
		},
		tasks: {
			addProduct: pipe(
				Tasks.addProduct,
				Eff.provide(useCases),
				Eff.provideService(Store.Service, store),
				toCallback,
			),
			setExpirationDate: toCallback(
				(value: string) =>
					pipe(
						Tasks.setExpirationDate(value),
						Eff.provideService(
							Store.Service,
							store,
						),
					),
			),
			setName: toCallback((name: string) =>
				pipe(
					Tasks.setName(name),
					Eff.provideService(
						Store.Service,
						store,
					),
				),
			),
			setNameInteracted: pipe(
				Tasks.setNameInteracted,
				Eff.provideService(Store.Service, store),
				toCallback,
			),
		},
	}
}
