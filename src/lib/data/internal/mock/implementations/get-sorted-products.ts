import { pipe } from 'effect';

import {
	A,
	Eff,
	L,
	NNInt,
	O,
	Ord,
} from '$lib/core/imports.ts';
import { asOption } from '$lib/core/utils.ts';

import { GetSortedProducts as Query } from '$lib/app/queries.ts';

import { withErrors } from '../constants.ts';
import { map } from '../db.ts';

const ord = Ord.make(
	(
		p1: Query.ProductDTO,
		p2: Query.ProductDTO,
	) => {
		return Ord.combineAll([
			pipe(
				Ord.number,
				Ord.reverse,
				O.getOrder,
				Ord.reverse,
				Ord.mapInput((product: typeof p1) =>
					asOption(product.maybeExpirationDate),
				),
			),
			pipe(
				Ord.string,
				O.getOrder,
				Ord.mapInput((product: typeof p1) =>
					asOption(product.maybeName),
				),
			),
		])(p1, p2);
	},
);

export const query = L.succeed(
	Query.Tag,
	Eff.gen(function* () {
		if (withErrors && Math.random() < 0.5)
			return yield* Eff.fail(undefined);

		const total = map.size;

		const products: Query.ProductDTO[] =
			Array.from(map.values()).map(elem => ({
				...elem,
			}));

		return {
			total: NNInt.unsafe_fromNumber(total),
			products: A.sort(ord)(products),
		};
	}),
);
