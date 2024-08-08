import {
	function as F,
	option as OPT,
	readerTask as RT,
	readerTaskEither as RTE,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import type { AddProduct } from '@/app/interfaces/write/add-product'
import type { Log } from '@/app/interfaces/write/log'

import { decodeData } from '../common'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'

const flow = F.flow

interface Deps {
	db: FridgySqlitePlugin
	log: Log
}

export const resultCodec = t.union([
	t.type({
		_tag: t.literal('Right'),
		right: t.undefined,
	}),
	t.type({
		_tag: t.literal('Left'),
		left: t.string,
	}),
])

export const fallbackResultCodec = withFallback(
	t.union([
		t.type({
			_tag: t.literal('Right'),
			right: withFallback(t.undefined, undefined),
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

const addProductCommand =
	(product: {
		name: string
		creationDate: number
		expirationDate?: number
	}) =>
	(deps: Deps) =>
	() =>
		deps.db.addProduct({ product })

export const addProduct: (d: Deps) => AddProduct =
	F.flip(
		flow(
			RT.of,
			RT.bindTo('product'),
			RT.chain(({ product }) =>
				addProductCommand({
					name: product.name,
					creationDate: product.creationDate,
					...(OPT.isSome(product.expirationDate)
						? {
								expirationDate:
									product.expirationDate.value,
							}
						: {}),
				}),
			),
			RT.chain(
				flow(
					decodeData(
						resultCodec,
						fallbackResultCodec,
					),
					RTE.local((deps: Deps) => deps.log),
				),
			),
			RTE.chainW(RTE.fromEither),
		),
	)
