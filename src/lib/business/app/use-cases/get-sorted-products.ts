import {
	A,
	E,
	Eff,
	Int,
	NNInt,
	O,
	pipe,
} from '$lib/core/imports.ts';
import { unsafe_fromNumber } from '$lib/core/integer/non-negative.ts';
import type { NonEmptyTrimmedString } from '$lib/core/non-empty-trimmed-string.ts';
import {
	type OptionOrValue,
	asOption,
} from '$lib/core/utils.ts';

import { GetSortedProducts } from '$lib/business/app/queries';
import * as P from '$lib/business/domain/product';

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

export class Service extends Eff.Service<Service>()(
	'app/GetSortedProducts',
	{
		effect: Eff.gen(function* () {
			const getProductListWithTotal =
				yield* GetSortedProducts.Tag;

			return Eff.gen(function* () {
				const [duration, errorOrData] =
					yield* pipe(
						getProductListWithTotal,
						Eff.either,
						Eff.timed,
					);

				if (E.isLeft(errorOrData)) {
					if (
						errorOrData.left._tag ===
						'FetchingFailed'
					) {
						yield* Eff.logError(
							`Could not receive items.`,
						).pipe(
							Eff.annotateLogs(
								'duration',
								duration,
							),
						);
					} else {
						yield* Eff.logError(
							`Received invalid data.`,
						).pipe(
							Eff.annotateLogs(
								'duration',
								duration,
							),
						);
					}

					return yield* Eff.fail(undefined);
				}

				const result = errorOrData.right;

				const total = yield* Eff.gen(
					function* () {
						if (
							result.total <
							result.products.length
						) {
							yield* Eff.logWarning(
								`Received ${result.products.length.toString(10)} items, but they exceed the reported total (${result.total.toString(10)}).`,
							).pipe(
								Eff.annotateLogs(
									'duration',
									duration,
								),
							);

							return unsafe_fromNumber(
								result.products.length,
							);
						}

						yield* Eff.logInfo(
							`Received ${result.products.length.toString(10)} items out of ${result.total.toString(10)}`,
						).pipe(
							Eff.annotateLogs(
								'duration',
								duration,
							),
						);

						return result.total;
					},
				);

				const [corrupts, entries] =
					A.partitionMap(
						result.products,
						rawProduct =>
							E.gen(function* () {
								const id = yield* pipe(
									asOption(rawProduct.maybeId),
									O.match({
										onNone: () =>
											E.left(rawProduct),
										onSome: E.right,
									}),
								);

								const product =
									P.createProduct(rawProduct);

								if (O.isNone(product)) {
									return {
										...rawProduct,
										id,
										isValid: false,
									} satisfies Product;
								}

								return {
									isValid: true,
									id,
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
			}) satisfies Eff.Effect<
				{
					products: {
						entries: Product[];
						corrupts: CorruptProduct[];
					};
					total: NNInt.NonNegativeInteger;
				},
				void
			>;
		}),
	},
) {}
