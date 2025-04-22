import { Eff, pipe } from '$lib/core/imports.ts';

import { useCases } from '$lib/business/index.ts';
import {
	runEffect,
	toCallback,
} from '$lib/ui/utils.ts';

import { type InternalReadonlyState } from './internal/state.svelte.ts';
import { createStore as internalCreateStore } from './internal/store.ts';

export type State = {
	name?: string;
	expirationDate?: number;
	currentDate: number;
	isAdding: boolean;
	toastMessage?: string;
};

export function createStore() {
	const store = internalCreateStore();

	const queueResetToast = toCallback(
		store.tasks.queueResetToast,
	);

	$effect(() => {
		if (store.derived.toastHasMessage) {
			queueResetToast();
		}
	});

	return {
		state:
			store.state as InternalReadonlyState['state'],
		derived:
			store.derived as InternalReadonlyState['derived'],

		tasks: {
			addProduct: pipe(
				store.tasks.addProduct,
				Eff.provide(useCases),
				toCallback,
			),

			setExpirationDate: (value: string) =>
				pipe(
					store.tasks.setExpirationDate(value),
					runEffect,
				),

			setName: (name: string) =>
				pipe(
					store.tasks.setName(name),
					runEffect,
				),
			initNameIfNotSet: pipe(
				store.tasks.initNameIfNotSet,
				toCallback,
			),
		},
	};
}
