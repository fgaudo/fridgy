import { O } from '$lib/core/imports.ts';

import type { StateContext } from './state.svelte.ts';

export const actions = {
	addingStarted:
		() =>
		({ state }: StateContext) => {
			{
				state.isAdding = true;
				state.toastMessage = undefined;
			}
		},

	addingSucceeded:
		() =>
		({ state }: StateContext) => {
			state.isAdding = false;
			state.name = undefined;
			state.expirationDate = undefined;

			state.toastMessage = 'Product added';
		},

	addingFailed:
		() =>
		({ state }: StateContext) => {
			state.isAdding = false;
		},

	addingCancelled:
		() =>
		({ state }: StateContext) => {
			state.isAdding = false;
		},

	cancelToast:
		() =>
		({ state }: StateContext) => {
			state.toastMessage = undefined;
		},

	initNameIfNotSet:
		() =>
		({ state, derived }: StateContext) => {
			if (O.isNone(derived.maybeName)) {
				state.name = '';
			}
		},

	setName:
		(name: string) =>
		({ state }: StateContext) => {
			state.name = name;
		},

	setExpirationDate:
		(value: string) =>
		({ state }: StateContext) => {
			if (value.length <= 0) {
				state.expirationDate = undefined;
				return;
			}
			state.expirationDate = Date.parse(value);
		},
};
