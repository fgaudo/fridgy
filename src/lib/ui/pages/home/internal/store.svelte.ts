import { SvelteSet } from 'svelte/reactivity';
import type { ReadonlyDeep } from 'type-fest';

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

export type InternalStore = {
	state: State;
	derived: { isSelectModeEnabled: boolean };
};

export type InternalReadonlyStore =
	ReadonlyDeep<InternalStore>;

export function createStore() {
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

	return {
		state,
		derived: {
			get isSelectModeEnabled() {
				return isSelectModeEnabled;
			},
		},
	};
}
