import {
	E,
	type NNInt,
} from '$lib/core/imports.ts';

import type { GetSortedProducts } from '$lib/business/index.ts';

import type {
	ProductViewModel,
	StateContext,
} from './state.svelte.ts';

function toggleItem(product: ProductViewModel) {
	return (context: StateContext) => {
		if (context.state.selected.has(product.id)) {
			product.isSelected = false;
			context.state.selected.delete(product.id);
			return;
		}

		context.state.selected.add(product.id);
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
	toggleMenu: () => (context: StateContext) => {
		context.state.isMenuOpen =
			!context.state.isMenuOpen;
	},
	fetchListCancelled:
		() =>
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(context: StateContext) => {},
	fetchListFinished:
		(result: FetchListResult) =>
		(context: StateContext) => {
			if (E.isLeft(result)) {
				context.state.receivedError = true;
				return;
			}

			context.state.products =
				result.right.products;
			context.state.total = result.right.total;
			context.state.isLoading = false;
		},
	fetchListStarted:
		() => (context: StateContext) => {
			context.state.isLoading = true;
		},
	disableSelectMode:
		() => (context: StateContext) => {
			context.state.selected.clear();
		},
	refreshTime:
		(timestamp: number) =>
		(context: StateContext) => {
			context.state.currentTimestamp = timestamp;
		},
	toggleItemByHold:
		(product: ProductViewModel) =>
		(context: StateContext) => {
			if (context.derived.isSelectModeEnabled) {
				return;
			}

			toggleItem(product)(context);
		},
	toggleItemByTap:
		(product: ProductViewModel) =>
		(context: StateContext) => {
			if (!context.derived.isSelectModeEnabled) {
				return;
			}

			toggleItem(product)(context);
		},
	enableRefreshTimeListeners:
		() => (context: StateContext) => {
			context.state.refreshTimeListenersRegistered =
				true;
		},
	disableRefreshTimeListeners:
		() => (context: StateContext) => {
			context.state.refreshTimeListenersRegistered =
				false;
		},
};
