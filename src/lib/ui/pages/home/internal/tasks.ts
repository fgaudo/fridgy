import {
	Cl,
	Eff,
	pipe,
} from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/business/index.ts';

import { Config } from '../config.ts';
import { StoreService } from './store.ts';

export const refreshList = pipe(
	Eff.gen(function* () {
		const store = yield* StoreService;

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
			const store = yield* StoreService;
			yield* Eff.sync(
				store.actions.fetchListCancelled,
			);
		}),
	),
);

export const refreshTimeInterval = Eff.gen(
	function* () {
		while (true) {
			const intervalMs =
				yield* Config.refreshIntervalMs;
			const time = yield* Cl.currentTimeMillis;
			const store = yield* StoreService;
			yield* Eff.sync(() =>
				store.actions.refreshTime(time),
			);
			yield* Eff.sleep(intervalMs);
		}
	},
);

export const refreshTime = Eff.gen(function* () {
	const time = yield* Cl.currentTimeMillis;
	const store = yield* StoreService;
	yield* Eff.sync(() =>
		store.actions.refreshTime(time),
	);
});
