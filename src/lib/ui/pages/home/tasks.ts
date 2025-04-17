import { Eff, pipe } from '$lib/core/imports.ts';

import { GetSortedProducts } from '$lib/app/use-cases.ts';

import type { Store } from './store.svelte.ts';

export const refreshList = (store: Store) =>
	pipe(
		Eff.gen(function* () {
			if (store.state.isLoading) {
				return;
			}

			yield* Eff.sync(
				store.actions.fetchListStarted,
			);

			const getProducts =
				yield* GetSortedProducts.Tag;

			const result =
				yield* Eff.either(getProducts);

			yield* Eff.sync(() =>
				store.actions.fetchListFinished(result),
			);
		}),

		Eff.onInterrupt(() =>
			Eff.sync(store.actions.fetchListCancelled),
		),
	);

export const refreshTimeInterval = (
	store: Store,
) =>
	pipe(
		Eff.sync(store.actions.refreshTime),
		Eff.andThen(Eff.sleep(20000)),
		Eff.forever,
	);
