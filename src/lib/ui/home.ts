import { E, Eff, O } from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/app/use-cases.ts';

import { useCases } from '$lib/runtime.ts';

export type ProductViewModel =
	GetSortedProducts.Product & {
		isSelected?: boolean;
	};

export type CorruptProductViewModel =
	GetSortedProducts.CorruptProduct;

export type State = {
	isMenuOpen: boolean;
	selected: Set<string>;
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

function toggleItem(
	id: string | O.Option<string>,
) {
	return (state: State) => {
		if (O.isOption(id) && O.isNone(id)) {
			return;
		}

		const _id =
			O.isOption(id) && O.isSome(id)
				? id.value
				: id;

		if (state.selected.has(_id)) {
			state.selected.delete(_id);
			return;
		}

		state.selected.add(_id);
	};
}

export function toggleItemByTap(
	id: string | O.Option<string>,
) {
	return (
		state: State,
		isSelectModeEnabled: boolean,
	) => {
		if (!isSelectModeEnabled) {
			return;
		}

		toggleItem(id)(state);
	};
}

export function toggleItemByHold(
	id: string | O.Option<string>,
) {
	return (
		state: State,
		isSelectModeEnabled: boolean,
	) => {
		if (isSelectModeEnabled) {
			return;
		}

		toggleItem(id)(state);
	};
}

export function refreshTime(state: State) {
	state.currentTimestamp = Date.now();
}

export function disableSelectMode(state: State) {
	state.selected.clear();
}
