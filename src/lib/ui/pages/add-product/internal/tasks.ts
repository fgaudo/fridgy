import {
	E,
	Eff,
	Int,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts';
import { asOption } from '$lib/core/utils.ts';

import { AddProduct } from '$lib/business/index.ts';
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts';

import { Store } from './store.ts';

export const addProduct = pipe(
	Eff.gen(function* () {
		const store = yield* Store;

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

		yield* Eff.sync(store.actions.addingStarted);

		const addProduct = yield* AddProduct.Service;
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
		Eff.gen(function* () {
			const store = yield* Store;
			yield* Eff.sync(
				store.actions.addingCancelled,
			);
		}),
	),
);

export const queueResetToast = Eff.gen(
	function* () {
		const store = yield* Store;
		yield* Eff.sleep(3000);
		store.actions.cancelToast();
	},
);

export const initNameIfNotSet = Eff.gen(
	function* () {
		const store = yield* Store;
		yield* Eff.sync(
			store.actions.initNameIfNotSet,
		);
	},
);

export const setName = (name: string) =>
	Eff.gen(function* () {
		const store = yield* Store;
		yield* Eff.sync(store.actions.setName(name));
	});

export const setExpirationDate = (
	value: string,
) =>
	Eff.gen(function* () {
		const store = yield* Store;
		yield* Eff.sync(
			store.actions.setExpirationDate(value),
		);
	});
