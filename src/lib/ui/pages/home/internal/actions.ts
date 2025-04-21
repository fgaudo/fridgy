import {
	E,
	type NNInt,
} from '$lib/core/imports.ts';

import type { GetSortedProducts } from '$lib/business/index.ts';

import type {
	InternalStore,
	ProductViewModel,
} from './store.svelte.ts';

export function fetchListStarted(
	store: InternalStore,
) {
	return () => (store.state.isLoading = true);
}

export function toggleMenu(store: InternalStore) {
	return () =>
		(store.state.isMenuOpen =
			!store.state.isMenuOpen);
}

export function refreshTime(
	store: InternalStore,
) {
	return () =>
		(store.state.currentTimestamp = Date.now());
}

export function toggleItemByTap(
	store: InternalStore,
) {
	return (product: ProductViewModel) => {
		if (!store.derived.isSelectModeEnabled) {
			return;
		}

		toggleItem(store)(product);
	};
}

export function toggleItemByHold(
	store: InternalStore,
) {
	return (product: ProductViewModel) => {
		if (store.derived.isSelectModeEnabled) {
			return;
		}

		toggleItem(store)(product);
	};
}

export function disableSelectMode(
	store: InternalStore,
) {
	return () => store.state.selected.clear();
}

export function fetchListCancelled(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_store: InternalStore,
) {
	return () => {};
}

export function fetchListFinished(
	store: InternalStore,
) {
	return (
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
	) => {
		if (E.isLeft(result)) {
			store.state.receivedError = true;
			return;
		}

		store.state.products = result.right.products;
		store.state.total = result.right.total;
		store.state.isLoading = false;
	};
}

export function toggleItem(store: InternalStore) {
	return (product: ProductViewModel) => {
		if (store.state.selected.has(product.id)) {
			product.isSelected = false;
			store.state.selected.delete(product.id);
			return;
		}

		store.state.selected.add(product.id);
		product.isSelected = true;
	};
}
