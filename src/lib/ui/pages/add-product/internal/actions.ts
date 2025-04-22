import { O } from '$lib/core/imports.ts';

import type { InternalState } from './state.svelte.ts';

export const actions = {
	addingStarted({ state }: InternalState) {
		return () => {
			state.isAdding = true;
			state.toastMessage = undefined;
		};
	},

	addingSucceeded({ state }: InternalState) {
		return () => {
			state.isAdding = false;
			state.name = undefined;
			state.expirationDate = undefined;

			state.toastMessage = 'Product added';
		};
	},

	addingFailed({ state }: InternalState) {
		return () => {
			state.isAdding = false;
		};
	},

	addingCancelled({ state }: InternalState) {
		return () => {
			state.isAdding = false;
		};
	},

	cancelToast({ state }: InternalState) {
		return () => {
			state.toastMessage = undefined;
		};
	},

	initNameIfNotSet({
		state,
		derived,
	}: InternalState) {
		return () => {
			if (O.isNone(derived.maybeName)) {
				state.name = '';
			}
		};
	},

	setName({ state }: InternalState) {
		return (name: string) => () => {
			state.name = name;
		};
	},

	setExpirationDate({ state }: InternalState) {
		return (value: string) => () => {
			if (value.length <= 0) {
				state.expirationDate = undefined;
				return;
			}
			state.expirationDate = Date.parse(value);
		};
	},
};
