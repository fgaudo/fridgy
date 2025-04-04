import { pipe } from 'effect';

import {
	A,
	Eff,
	L,
	NNInt,
	O,
	Ord,
} from '$lib/core/imports.ts';

import { GetSortedProducts as Query } from '$lib/app/queries.ts';
import type { GetSortedProducts as Usecase } from '$lib/app/use-cases.ts';

import { withErrors } from '../constants.ts';
import { map } from '../db.ts';

const ord = Ord.make(
	(
		p1: Usecase.ProductModel,
		p2: Usecase.ProductModel,
	) => {
		if (p1.isValid && !p2.isValid) {
			return -1;
		}

		if (!p1.isValid && p2.isValid) {
			return 1;
		}

		if (p1.isValid && p2.isValid) {
			return Ord.combineAll([
				pipe(
					Ord.number,
					Ord.reverse,
					O.getOrder,
					Ord.reverse,
					Ord.mapInput(
						(product: typeof p1) =>
							product.expirationDate,
					),
				),
				pipe(
					Ord.string,
					Ord.mapInput(
						(product: typeof p1) => product.name,
					),
				),
			])(p1, p2);
		}

		return 0;
	},
);

export const query = L.succeed(
	Query.Tag,
	Eff.gen(function* () {
		if (withErrors && Math.random() < 0.5)
			return yield* Eff.fail(undefined);

		const total = map.size;

		const products: Usecase.ProductModel[] =
			Array.from(map.values()).map(elem => ({
				...elem,
				isValid: true,
			}));

		return {
			total: NNInt.unsafe_fromNumber(total),
			products: A.sort(ord)(products),
		};
	}),
);
