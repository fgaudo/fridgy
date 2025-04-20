import { SvelteSet } from 'svelte/reactivity';
import type { ReadonlyDeep } from 'type-fest';

import { E, NNInt } from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/business/index.ts';

export type ProductViewModel =
	GetSortedProducts.Product & {
		isSelected?: boolean;
	};

export type CorruptProductViewModel =
	GetSortedProducts.CorruptProduct;

export type State = {
	isMenuOpen: boolean;
	selected: SvelteSet<string>;
	receivedError: boolean;
	isLoading: boolean;
	total: number;
	currentTimestamp: number;
	products: {
		entries: ProductViewModel[];
		corrupts: CorruptProductViewModel[];
	};
};

function _createStore() {
	const state = $state<State>({
		isMenuOpen: false,
		isLoading: false,
		selected: new SvelteSet(),
		receivedError: false,
		total: 0,
		products: {
			entries: [],
			corrupts: [],
		},
		currentTimestamp: Date.now(),
	});

	const isSelectModeEnabled = $derived(
		state.selected.size > 0,
	);

	function toggleItem(product: ProductViewModel) {
		if (state.selected.has(product.id)) {
			product.isSelected = false;
			state.selected.delete(product.id);
			return;
		}

		state.selected.add(product.id);
		product.isSelected = true;
	}

	return {
		state,
		derived: {
			get isSelectModeEnabled() {
				return isSelectModeEnabled;
			},
		},
		actions: {
			fetchListStarted() {
				state.isLoading = true;
			},

			toggleMenu() {
				state.isMenuOpen = !state.isMenuOpen;
			},

			refreshTime() {
				state.currentTimestamp = Date.now();
			},

			toggleItemByTap(product: ProductViewModel) {
				if (!isSelectModeEnabled) {
					return;
				}

				toggleItem(product);
			},

			toggleItemByHold(
				product: ProductViewModel,
			) {
				if (isSelectModeEnabled) {
					return;
				}

				toggleItem(product);
			},

			disableSelectMode() {
				state.selected.clear();
			},

			fetchListCancelled() {},

			fetchListFinished(
				result: E.Either<
					{
						products: {
							entries: GetSortedProducts.Product[];
							corrupts: GetSortedProducts.CorruptProduct[];
						};
						total: NNInt.NonNegativeInteger;
					},
					void
				>,
			) {
				if (E.isLeft(result)) {
					state.receivedError = true;
					return;
				}

				state.products = result.right.products;
				state.total = result.right.total;
				state.isLoading = false;
			},
		},
	};
}

export type Store = ReadonlyDeep<
	ReturnType<typeof _createStore>
>;

export const createStore =
	_createStore as () => Store;
