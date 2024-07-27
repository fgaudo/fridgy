import * as O from '@fgaudo/fp-ts-rxjs/Observable.js'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import * as B from '@/core/base64'

import {
	type OnProducts,
	ProductEntityDTO,
} from '@/app/interfaces/read/on-products'

import { readTransaction } from '@/data/sqlite/helpers'
import { log } from '@/data/system/write/log'

const pipe = F.pipe

interface Deps {
	db: SQLitePlugin.Database
	events: Rx.Observable<void>
	prefix: string
}

export const productDecoder = t.readonly(
	t.type({
		id: t.string,
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
const mapData = RoA.reduce<
	unknown,
	readonly ProductEntityDTO[]
>(RoA.empty, (set, row) => {
	const productRowEither =
		productDecoder.decode(row)

	if (E.isLeft(productRowEither)) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: 'Row could not be parsed',
		})()

		return set
	}

	const productRow = productRowEither.right

	if (productRow.name === undefined) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: `Could not parse name of row ${productRow.id}`,
		})()
	}

	const productData = {
		id: B.encodeText(productRow.id),
		product: {
			name: productRow.name ?? '[undefined]',
			expDate: OPT.fromNullable(
				productRow.expDate,
			),
		},
	}

	return pipe(set, RoA.append(productData))
})

export const products: (
	deps: Deps,
) => OnProducts = F.flip(
	F.flow(
		options => (deps: Deps) =>
			pipe(
				deps.events,
				Rx.map(() => ({
					options,
				})),
			),
		RO.switchMap(vars =>
			pipe(
				readTransaction(
					[
						'SELECT *, c.total_rows FROM products (SELECT count(*) FROM products) c LIMIT ? OFFSET ? ORDER BY expDate',
						[30, vars.options.offset],
					],
					['SELECT count(*) FROM products'],
				),
				R.local((deps: Deps) => deps.db),
				R.map(Rx.defer),
				RO.map(result => ({
					...vars,
					result,
				})),
			),
		),
		R.map(
			O.filterMap(vars =>
				pipe(
					vars.result,
					OPT.getRight,
					OPT.map(rows => ({
						...vars,
						result: rows,
					})),
				),
			),
		),
		RO.map(vars => ({
			...vars,
			result: {
				rows: pipe(
					Array(
						vars.result[0].rows.length,
					).keys(),
					Array.from<number>,
					RoA.fromArray,
					RoA.map(
						n =>
							vars.result[0].rows.item(
								n,
							) as unknown,
					),
				),
				total: vars.result[1].rows.item(
					0,
				) as unknown,
			},
		})),
		RO.map(vars => ({
			items: mapData(vars.rows),
			offset: vars.options.offset,
			total: vars.total,
		})),
	),
)
