import {
	E,
	Eff,
	Int,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts';
import { asOption } from '$lib/core/utils.ts';

import { AddProduct } from '$lib/app/use-cases.ts';

import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts';

import type { Store } from './store.svelte.ts';

export const addProduct = (store: Store) =>
	pipe(
		Eff.gen(function* () {
			if (store.state.isAdding) {
				return;
			}

			const name = yield* pipe(
				asOption(store.state.name),
				O.flatMap(NETS.fromString),
			);

			const maybeExpirationDate = pipe(
				asOption(store.state.expirationDate),
				O.flatMap(Int.fromNumber),
			);

			yield* Eff.sync(
				store.actions.addingStarted,
			);

			const addProduct = yield* AddProduct.Tag;
			const [result] = yield* Eff.all([
				Eff.either(
					addProduct({
						name: name,
						maybeExpirationDate,
					}),
				),
				Eff.sleep(MINIMUM_LAG_MS),
			]);

			if (E.isLeft(result)) {
				return yield* Eff.sync(
					store.actions.addingFailed,
				);
			}

			yield* Eff.sync(
				store.actions.addingSucceeded,
			);
		}),

		Eff.onInterrupt(() =>
			Eff.sync(store.actions.addingCancelled),
		),
	);

export const queueResetToast = (store: Store) =>
	Eff.gen(function* () {
		yield* Eff.sleep(3000);
		store.actions.cancelToast();
	});
