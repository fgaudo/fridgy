import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import { PRODUCTS_TABLE } from './schema'

export const productCodec = t.intersection([
	t.type({
		[PRODUCTS_TABLE.columns.id]: t.number,
		[PRODUCTS_TABLE.columns.name]: withFallback(
			t.union([t.string, t.undefined]),
			undefined,
		),

		[PRODUCTS_TABLE.columns.creationDate]:
			withFallback(
				t.union([t.number, t.undefined]),
				undefined,
			),
	}),
	t.partial({
		[PRODUCTS_TABLE.columns.expiration.name]:
			withFallback(
				t.union([
					t.type({
						[PRODUCTS_TABLE.columns.expiration
							.value.isBestBefore]: t.boolean,
						[PRODUCTS_TABLE.columns.expiration
							.value.date]: t.number,
					}),

					t.undefined,
				]),
				undefined,
			),
	}),
])

export type ProductRow = t.TypeOf<
	typeof productCodec
>
