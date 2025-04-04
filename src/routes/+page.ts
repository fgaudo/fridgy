import { dependencies } from '$lib/runtime.ts';

import {
	E,
	Eff,
	pipe,
} from '$lib/core/imports.ts';

import { GetSortedProductsUseCase } from '$lib/app';

import type { PageLoad } from './$types';

export const load: PageLoad = () =>
	pipe(
		Eff.gen(function* () {
			const getProducts =
				yield* GetSortedProductsUseCase;

			const result =
				yield* Eff.either(getProducts);

			if (E.isLeft(result)) {
				return yield* Eff.fail('ciao');
			}

			return result.right;
		}),
		Eff.provide(dependencies),
		Eff.either,
		Eff.runPromise,
	);
