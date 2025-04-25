import { asOption } from '$lib/core/utils.ts';

import { GetSortedProducts } from '$lib/business/index.ts';

export type ProductViewModel =
	GetSortedProducts.Product & {
		isSelected?: boolean;
	};

export type CorruptProductViewModel =
	GetSortedProducts.CorruptProduct;

type State = {
	name?: string;
	expirationDate?: number;
	currentDate: number;
	isAdding: boolean;
	toastMessage?: string;
};

export type StateContext = ReturnType<
	typeof createStateContext
>;

export function createStateContext() {
	const state = $state<State>({
		currentDate: Date.now(),
		isAdding: false,
	});

	const isNameValid = $derived(
		(state.name?.length ?? 0) > 0,
	);

	const isOk = $derived(isNameValid);

	const maybeExpirationDate = $derived(
		asOption(state.expirationDate),
	);
	const maybeName = $derived(
		asOption(state.name),
	);

	const nameOrEmpty = $derived(state.name ?? '');

	const formattedCurrentDate = $derived(
		new Date(state.currentDate)
			.toISOString()
			.substring(0, 10),
	);

	const formattedExpirationDateOrEmpty = $derived(
		state.expirationDate
			? new Date(state.expirationDate)
					.toISOString()
					.substring(0, 10)
			: '',
	);

	const toastHasMessage = $derived(
		(state.toastMessage?.length ?? 0) > 0,
	);

	return {
		state,
		derived: {
			get maybeExpirationDate() {
				return maybeExpirationDate;
			},
			get maybeName() {
				return maybeName;
			},

			get isOk() {
				return isOk;
			},
			get isNameValid() {
				return isNameValid;
			},
			get formattedCurrentDate() {
				return formattedCurrentDate;
			},
			get toastHasMessage() {
				return toastHasMessage;
			},
			get nameOrEmpty() {
				return nameOrEmpty;
			},
			get formattedExpirationDateOrEmpty() {
				return formattedExpirationDateOrEmpty;
			},
		},
	};
}
