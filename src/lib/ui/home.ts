import type { SvelteSet } from 'svelte/reactivity';

import { E, Eff } from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/app/use-cases.ts';

import { useCases } from '$lib/bootstrap';

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

export function fetchList(state: State) {
	return Eff.provide(
		Eff.gen(function* () {
			const getProducts =
				yield* GetSortedProducts.Tag;

			const result =
				yield* Eff.either(getProducts);

			if (E.isLeft(result)) {
				state.receivedError = true;
				return;
			}

			state.products = result.right.products;
			state.total = result.right.total;
			state.isLoading = false;
		}),
		useCases,
	);
}

export function refreshTimeInterval(
	state: State,
) {
	return Eff.gen(function* () {
		while (true) {
			refreshTime(state);
			yield* Eff.sleep(20000);
		}
	});
}

export function toggleMenu(state: State) {
	state.isMenuOpen = !state.isMenuOpen;
}

function toggleItem(id: string) {
	return (
		state: State,
		product: ProductViewModel,
	) => {
		if (state.selected.has(id)) {
			product.isSelected = false;
			state.selected.delete(id);
			return;
		}

		state.selected.add(id);
		product.isSelected = true;
	};
}

export function toggleItemByTap(id: string) {
	return (
		state: State,
		product: ProductViewModel,
		isSelectModeEnabled: boolean,
	) => {
		if (!isSelectModeEnabled) {
			return;
		}

		toggleItem(id)(state, product);
	};
}

export function toggleItemByHold(id: string) {
	return (
		state: State,
		product: ProductViewModel,

		isSelectModeEnabled: boolean,
	) => {
		if (isSelectModeEnabled) {
			return;
		}

		toggleItem(id)(state, product);
	};
}

export function refreshTime(state: State) {
	state.currentTimestamp = Date.now();
}

export function disableSelectMode(state: State) {
	state.selected.clear();
}
