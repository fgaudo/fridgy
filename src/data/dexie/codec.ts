import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import { PRODUCTS_TABLE } from './schema'

const defaultValues = {
	[PRODUCTS_TABLE.columns.id]: -1,
	[PRODUCTS_TABLE.columns.name]: '[UNDEFINED]',
	[PRODUCTS_TABLE.columns.creationDate]: 0,
	[PRODUCTS_TABLE.columns.expirationDate]: 0,
	[PRODUCTS_TABLE.columns.isBestBefore]: false,
}

export const productCodec = t.intersection([
	t.type({
		[PRODUCTS_TABLE.columns.id]: t.number,
		[PRODUCTS_TABLE.columns.name]: t.string,
		[PRODUCTS_TABLE.columns.creationDate]:
			t.number,
		[PRODUCTS_TABLE.columns.expirationDate]:
			t.number,
	}),
	t.partial({
		[PRODUCTS_TABLE.columns.isBestBefore]:
			t.boolean,
	}),
])

export type ProductRow = t.TypeOf<
	typeof productCodec
>

export const fallbackProductCodec = t.partial({
	[PRODUCTS_TABLE.columns.id]: withFallback(
		t.number,
		defaultValues[PRODUCTS_TABLE.columns.id],
	),
	[PRODUCTS_TABLE.columns.name]: withFallback(
		t.string,
		defaultValues[PRODUCTS_TABLE.columns.name],
	),
	[PRODUCTS_TABLE.columns.creationDate]:
		withFallback(
			t.number,
			defaultValues[
				PRODUCTS_TABLE.columns.creationDate
			],
		),
	[PRODUCTS_TABLE.columns.expirationDate]:
		withFallback(
			t.number,
			defaultValues[
				PRODUCTS_TABLE.columns.expirationDate
			],
		),
	[PRODUCTS_TABLE.columns.isBestBefore]:
		withFallback(
			t.boolean,
			defaultValues[
				PRODUCTS_TABLE.columns.isBestBefore
			],
		),
})

type FallbackProductRaw = t.TypeOf<
	typeof fallbackProductCodec
>

export const decodeProduct = (
	row: FallbackProductRaw,
): ProductRow => ({
	creation_date:
		row.creation_date ??
		defaultValues[
			PRODUCTS_TABLE.columns.creationDate
		],
	expiration_date:
		row.expiration_date ??
		defaultValues[
			PRODUCTS_TABLE.columns.expirationDate
		],
	name:
		row.name ??
		defaultValues[PRODUCTS_TABLE.columns.name],
	id:
		row.id ??
		defaultValues[PRODUCTS_TABLE.columns.id],
	...(row.is_best_before
		? { is_best_before: row.is_best_before }
		: {}),
})
