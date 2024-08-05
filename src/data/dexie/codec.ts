import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import { PRODUCTS_TABLE } from './schema'

const defaultValues = {
	[PRODUCTS_TABLE.columns.name]: '[UNDEFINED]',
	[PRODUCTS_TABLE.columns.creationDate]: 0,
}

export const productCodec = t.intersection([
	t.type({
		[PRODUCTS_TABLE.columns.id]: t.number,
		[PRODUCTS_TABLE.columns.name]: t.string,
		[PRODUCTS_TABLE.columns.creationDate]:
			t.number,
	}),
	t.partial({
		[PRODUCTS_TABLE.columns.expirationDate]:
			t.number,
	}),
])

export type ProductRow = t.TypeOf<
	typeof productCodec
>

export const fallbackProductCodec =
	t.intersection([
		t.type({
			[PRODUCTS_TABLE.columns.id]: t.number,
		}),
		t.partial({
			[PRODUCTS_TABLE.columns.name]: withFallback(
				t.string,
				defaultValues[
					PRODUCTS_TABLE.columns.name
				],
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
					t.union([t.number, t.undefined]),
					undefined,
				),
		}),
	])

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
	...(row.expiration_date
		? { expiration_date: row.expiration_date }
		: {}),
	name:
		row.name ??
		defaultValues[PRODUCTS_TABLE.columns.name],
	id: row.id,
})
