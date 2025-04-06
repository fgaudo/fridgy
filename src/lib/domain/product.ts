import {
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts';

const productSymbol: unique symbol = Symbol();

export interface Product {
	[productSymbol]: {
		name: NETS.NonEmptyTrimmedString;
		expirationDate: O.Option<Int.Integer>;
		creationDate: Int.Integer;
	};
}

export const createProduct: (f: {
	maybeName?:
		| O.Option<NETS.NonEmptyTrimmedString>
		| NETS.NonEmptyTrimmedString;
	maybeCreationDate?:
		| O.Option<Int.Integer>
		| Int.Integer;
	maybeExpirationDate?:
		| O.Option<Int.Integer>
		| Int.Integer;
}) => O.Option<Product> = productDummy =>
	O.gen(function* () {
		const name = yield* O.isOption(
			productDummy.maybeName,
		)
			? productDummy.maybeName
			: O.fromNullable(productDummy.maybeName);

		const creationDate = yield* O.isOption(
			productDummy.maybeCreationDate,
		)
			? productDummy.maybeCreationDate
			: O.fromNullable(
					productDummy.maybeCreationDate,
				);

		const expirationDate = O.isOption(
			productDummy.maybeExpirationDate,
		)
			? productDummy.maybeExpirationDate
			: O.fromNullable(
					productDummy.maybeExpirationDate,
				);

		return {
			[productSymbol]: {
				name,
				creationDate,
				expirationDate,
			},
		};
	});

export const name = (product: Product) =>
	product[productSymbol].name;

export const maybeExpirationDate = (
	product: Product,
) => product[productSymbol].expirationDate;

export const creationDate = (product: Product) =>
	product[productSymbol].creationDate;
