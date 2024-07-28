import {
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlyArray as RoA,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import {
	ProductEntityDTO,
	type Products,
} from '@/app/interfaces/read/products'

import * as H from '@/data/sqlite/helpers'
import { log } from '@/data/system/write/log'

const pipe = F.pipe

interface Deps {
	db: SQLitePlugin.Database
	prefix: string
}

export const productDecoder = t.readonly(
	t.type({
		id: t.bigint,
		name: withFallback(
			t.union([t.string, t.undefined]),
			undefined,
		),
		expDate: withFallback(
			t.union([
				t.readonly(
					t.type({
						isBestBefore: t.boolean,
						timestamp: t.number,
					}),
				),

				t.undefined,
			]),
			undefined,
		),
	}),
)
const decodeData = RoA.reduce<
	unknown,
	readonly ProductEntityDTO[]
>(RoA.empty, (productDTOs, row) => {
	const productRowEither =
		productDecoder.decode(row)

	if (E.isLeft(productRowEither)) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: 'Row could not be parsed',
		})()

		return productDTOs
	}

	const productRow = productRowEither.right

	if (productRow.name === undefined) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: `Could not parse name of row ${productRow.id.toString(10)}`,
		})()
	}

	const productData = {
		id: productRow.id.toString(10),
		product: {
			name: productRow.name ?? '[undefined]',
			expDate: OPT.fromNullable(
				productRow.expDate,
			),
		},
	}

	return pipe(
		productDTOs,
		RoA.append(productData),
	)
})

const decodeTotal = (total: unknown) => {
	const decoded = t.number.decode(total)
	if (E.isLeft(decoded)) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: `Could not parse the total amount of products`,
		})()
		return 0
	} else return decoded.right
}

export const products: (deps: Deps) => Products =
	F.flip(
		F.flow(
			RTE.of,
			RTE.bindTo('options'),
			RTE.bind('results', ({ options }) =>
				H.readTransaction(
					[
						'SELECT * FROM products LIMIT ? OFFSET ? ORDER BY expDate',
						[30, options.offset],
					],
					['SELECT count(*) FROM products'],
				),
			),
			RTE.local((deps: Deps) => deps.db),
			RTE.bindW(
				'total',
				({ results: [, { rows }] }) =>
					pipe(
						rows,
						RTE.fromPredicate(
							rows => rows.length === 1,
							rows =>
								new Error(
									`total has ${rows.length.toString(10)} rows`,
								),
						),
						RTE.map(
							total => total.item(0) as unknown,
						),
					),
			),
			RTE.bindW(
				'products',
				({ results: [{ rows }] }) =>
					pipe(
						Array(rows.length).keys(),
						Array.from<number>,
						RoA.fromArray,
						RoA.map(n => rows.item(n) as unknown),
						RTE.right,
					),
			),
			RTE.map(vars => ({
				items: decodeData(vars.products),
				total: decodeTotal(vars.total),
			})),
		),
	)
