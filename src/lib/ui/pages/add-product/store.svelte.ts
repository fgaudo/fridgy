import type { ReadonlyDeep } from 'type-fest';

import { O } from '$lib/core/imports.ts';
import { asOption } from '$lib/core/utils.ts';

export type State = {
	name?: string;
	expirationDate?: number;
	currentDate: number;
	isAdding: boolean;
	toastMessage?: string;
};

function _createStore() {
	const state = $state<State>({
		currentDate: Date.now(),
		isAdding: false,
	});

	const isNameValid = $derived(
		(state.name?.length ?? 0) > 0,
	);

	const isOk = $derived(isNameValid);

	const [maybeExpirationDate, maybeName] =
		$derived([
			asOption(state.expirationDate),
			asOption(state.name),
		]);

	const formattedCurrentDate = $derived(
		new Date(state.currentDate)
			.toISOString()
			.substring(0, 10),
	);

	const toastHasMessage = $derived(
		(state.toastMessage?.length ?? 0) > 0,
	);

	return {
		state,

		derived: {
			get isOk() {
				return isOk;
			},

			get maybeExpirationDate() {
				return maybeExpirationDate;
			},

			get toastHasMessage() {
				return toastHasMessage;
			},

			get maybeName() {
				return maybeName;
			},

			get formattedCurrentDate() {
				return formattedCurrentDate;
			},

			get isNameValid() {
				return isNameValid;
			},

			getNameOrEmpty() {
				return state.name ?? '';
			},

			getExpiration() {
				return state.expirationDate
					? new Date(state.expirationDate)
							.toISOString()
							.substring(0, 10)
					: '';
			},
		},

		actions: {
			addingStarted() {
				state.isAdding = true;
				state.toastMessage = undefined;
			},

			addingSucceeded() {
				state.isAdding = false;
				state.name = undefined;
				state.expirationDate = undefined;

				state.toastMessage = 'Product added';
			},

			addingFailed() {
				state.isAdding = false;
			},

			addingCancelled() {
				state.isAdding = false;
			},

			cancelToast() {
				state.toastMessage = undefined;
			},

			initNameIfNotSet() {
				if (O.isNone(maybeName)) {
					state.name = '';
				}
			},
			setName(name: string) {
				state.name = name;
			},

			setExpiration(value: string) {
				if (value.length <= 0) {
					state.expirationDate = undefined;
					return;
				}
				state.expirationDate = Date.parse(value);
			},
		},
	};
}

export type Store = ReadonlyDeep<
	ReturnType<typeof _createStore>
>;

export const createStore =
	_createStore as () => Store;
