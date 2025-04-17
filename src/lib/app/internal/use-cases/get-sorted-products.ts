import { Duration } from 'effect';

import {
	A,
	C,
	E,
	Eff,
	Int,
	L,
	NNInt,
	O,
	pipe,
} from '$lib/core/imports.ts';
import type { NonEmptyTrimmedString } from '$lib/core/non-empty-trimmed-string.ts';
import {
	type OptionOrValue,
	asOption,
} from '$lib/core/utils.ts';

import * as P from '$lib/domain/product.ts';

import { GetSortedProducts } from '$lib/app/queries.ts';

export type Product =
	| {
			id: string;
			name: NonEmptyTrimmedString;
			maybeExpirationDate: OptionOrValue<Int.Integer>;
			creationDate: Int.Integer;
			isValid: true;
	  }
	| {
			id: string;
			maybeName: OptionOrValue<NonEmptyTrimmedString>;
			maybeExpirationDate: OptionOrValue<Int.Integer>;
			maybeCreationDate: OptionOrValue<Int.Integer>;
			isValid: false;
	  };

export type CorruptProduct = {
	maybeName: OptionOrValue<NonEmptyTrimmedString>;
};

export class Tag extends C.Tag(
	'GetSortedProductsUseCase',
)<
	Tag,
	Eff.Effect<
		{
			products: {
				entries: Product[];
				corrupts: CorruptProduct[];
			};
			total: NNInt.NonNegativeInteger;
		},
		void
	>
>() {}

export const useCase = L.effect(
	Tag,
	Eff.gen(function* () {
		const getProductListWithTotal =
			yield* GetSortedProducts.Tag;

		return Eff.gen(function* () {
			const [
				duration,
				{ total, products: rawProducts },
			] = yield* pipe(
				Eff.timed(getProductListWithTotal),
				Eff.catchAll(({ message }) =>
					Eff.logError(message).pipe(
						Eff.andThen(Eff.fail(undefined)),
					),
				),
			);

			yield* Eff.logInfo(
				`Received ${rawProducts.length.toString(10)} products out of ${total.toString(10)}`,
			).pipe(
				Eff.annotateLogs('products', rawProducts),
				Eff.annotateLogs(
					'duration',
					Duration.format(duration),
				),
			);

			const [corrupts, entries] = A.partitionMap(
				rawProducts,
				rawProduct =>
					E.gen(function* () {
						const maybeId = asOption(
							rawProduct.maybeId,
						);

						if (O.isNone(maybeId)) {
							return yield* E.left(rawProduct);
						}

						const product =
							P.createProduct(rawProduct);

						if (O.isNone(product)) {
							return {
								maybeName: rawProduct.maybeName,
								maybeCreationDate:
									rawProduct.maybeCreationDate,
								maybeExpirationDate:
									rawProduct.maybeExpirationDate,
								id: maybeId.value,
								isValid: false,
							} satisfies Product;
						}

						return {
							isValid: true,
							id: maybeId.value,
							name: P.name(product.value),
							creationDate: P.creationDate(
								product.value,
							),
							maybeExpirationDate:
								P.maybeExpirationDate(
									product.value,
								),
						} satisfies Product;
					}),
			);

			return {
				products: {
					entries,
					corrupts,
				},
				total,
			};
		});
	}),
);
