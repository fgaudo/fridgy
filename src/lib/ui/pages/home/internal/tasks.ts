import {
	Cl,
	Eff,
	pipe,
} from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/business/index.ts';

import { Store } from './store.ts';

export const refreshList = pipe(
	Eff.gen(function* () {
		const store = yield* Store;

		if (store.state.isLoading) {
			return;
		}

		yield* Eff.sync(
			store.actions.fetchListStarted,
		);

		const getProducts =
			yield* GetSortedProducts.Service;

		const result = yield* Eff.either(getProducts);

		yield* Eff.sync(() =>
			store.actions.fetchListFinished(result),
		);
	}),

	Eff.onInterrupt(() =>
		Eff.gen(function* () {
			const store = yield* Store;
			yield* Eff.sync(
				store.actions.fetchListCancelled,
			);
		}),
	),
);

export const refreshTimeInterval = Eff.gen(
	function* () {
		while (true) {
			const time = yield* Cl.currentTimeMillis;
			const store = yield* Store;
			console.log('interval', time);

			yield* Eff.sync(() =>
				store.actions.refreshTime(time),
			);
			yield* Eff.sleep(20000);
		}
	},
);

export const refreshTime = Eff.gen(function* () {
	const time = yield* Cl.currentTimeMillis;
	const store = yield* Store;
	console.log('refresh', time);
	yield* Eff.sync(() =>
		store.actions.refreshTime(time),
	);
});

export const toggleMenu = Eff.gen(function* () {
	const store = yield* Store;

	Eff.sync(store.actions.toggleMenu);
});

export const disableSelectMode = Eff.gen(
	function* () {
		const store = yield* Store;
		Eff.sync(store.actions.disableSelectMode);
	},
);
