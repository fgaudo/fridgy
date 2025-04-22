import {
	E,
	type NNInt,
} from '$lib/core/imports.ts';

import type { GetSortedProducts } from '$lib/business/index.ts';

import type {
	InternalState,
	ProductViewModel,
} from './state.svelte.ts';

function toggleItem(store: InternalState) {
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

type FetchListResult = E.Either<
	{
		products: {
			entries: GetSortedProducts.Product[];
			corrupts: GetSortedProducts.CorruptProduct[];
		};
		total: NNInt.NonNegativeInteger;
	},
	void
>;

export const actions = {
	toggleMenu: (store: InternalState) => {
		return () => {
			store.state.isMenuOpen =
				!store.state.isMenuOpen;
		};
	},
	fetchListCancelled: (
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_store: InternalState,
	) => {
		return () => {};
	},
	fetchListFinished: (store: InternalState) => {
		return (result: FetchListResult) => {
			if (E.isLeft(result)) {
				store.state.receivedError = true;
				return;
			}

			store.state.products =
				result.right.products;
			store.state.total = result.right.total;
			store.state.isLoading = false;
		};
	},
	fetchListStarted: (store: InternalState) => {
		return () => {
			store.state.isLoading = true;
		};
	},
	disableSelectMode: (store: InternalState) => {
		return () => store.state.selected.clear();
	},
	refreshTime: (store: InternalState) => {
		return (timestamp: number) => {
			store.state.currentTimestamp = timestamp;
		};
	},
	toggleItemByHold: (store: InternalState) => {
		return (product: ProductViewModel) => {
			if (store.derived.isSelectModeEnabled) {
				return;
			}

			toggleItem(store)(product);
		};
	},
	toggleItemByTap: (store: InternalState) => {
		return (product: ProductViewModel) => {
			if (!store.derived.isSelectModeEnabled) {
				return;
			}

			toggleItem(store)(product);
		};
	},
};
