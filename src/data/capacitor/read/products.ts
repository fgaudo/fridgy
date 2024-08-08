import {
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readerTaskEither as RTE,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import type { Products } from '@/app/interfaces/read/products'
import type { Log } from '@/app/interfaces/write/log'

import { decodeData } from '../common'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'

interface Deps {
	db: FridgySqlitePlugin
	log: Log
}

const pipe = F.pipe
const flow = F.flow

const PRODUCT_ID = 'id'
const PRODUCT_NAME = 'name'
const PRODUCT_EXPIRATION_DATE = 'expirationDate'
const PRODUCT_CREATION_DATE = 'creationDate'

const defaultValues = {
	[PRODUCT_ID]: -1,
	[PRODUCT_NAME]: '[UNDEFINED]',
	[PRODUCT_CREATION_DATE]: 0,
}

export const productCodec = t.union([
	t.type({
		_tag: t.literal('Right'),
		right: t.type({
			products: t.array(
				t.intersection([
					t.type({
						[PRODUCT_ID]: t.number,
						[PRODUCT_NAME]: t.string,
						[PRODUCT_CREATION_DATE]: t.number,
					}),
					t.partial({
						[PRODUCT_EXPIRATION_DATE]: t.number,
					}),
				]),
			),
			total: t.number,
		}),
	}),
	t.type({
		_tag: t.literal('Left'),
		left: t.string,
	}),
])

export const fallbackProductsCodec = withFallback(
	t.union([
		t.type({
			_tag: t.literal('Right'),
			right: withFallback(
				t.partial({
					products: withFallback(
						t.array(
							withFallback(
								t.partial({
									[PRODUCT_ID]: withFallback(
										t.number,
										defaultValues[PRODUCT_ID],
									),
									[PRODUCT_NAME]: withFallback(
										t.string,
										defaultValues[PRODUCT_NAME],
									),
									[PRODUCT_CREATION_DATE]:
										withFallback(
											t.number,
											defaultValues[
												PRODUCT_CREATION_DATE
											],
										),

									[PRODUCT_EXPIRATION_DATE]:
										withFallback(
											t.union([
												t.number,
												t.undefined,
											]),
											undefined,
										),
								}),
								{
									[PRODUCT_ID]:
										defaultValues[PRODUCT_ID],
									[PRODUCT_NAME]:
										defaultValues[PRODUCT_NAME],
									[PRODUCT_CREATION_DATE]:
										defaultValues[
											PRODUCT_CREATION_DATE
										],
								},
							),
						),
						[],
					),
					total: withFallback(t.number, 0),
				}),
				{
					products: [],
					total: 0,
				},
			),
		}),
		t.type({
			_tag: t.literal('Left'),
			left: withFallback(
				t.string,
				'Unknown error',
			),
		}),
	]),
	{ _tag: 'Left', left: 'Error while decoding' },
)

export const products: R.Reader<Deps, Products> =
	pipe(
		R.asks((deps: Deps) =>
			deps.db.getAllProductsWithTotal(),
		),
		R.flatMap(
			flow(
				decodeData(
					productCodec,
					fallbackProductsCodec,
				),
				R.local((deps: Deps) => deps.log),
			),
		),
		RTE.map(
			flow(
				E.map(result => ({
					total: result.total ?? 0,
					items:
						result.products?.map(product => ({
							creationDate:
								product.creationDate ??
								defaultValues[
									PRODUCT_CREATION_DATE
								],
							expirationDate: OPT.fromNullable(
								product.expirationDate,
							),
							name:
								product.name ??
								defaultValues[PRODUCT_NAME],
							id: (
								product.id ??
								defaultValues[PRODUCT_ID]
							).toString(10),
						})) ?? [],
				})),
			),
		),
		RTE.chainW(RTE.fromEither),
	)
