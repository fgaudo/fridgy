import * as O from '@fgaudo/fp-ts-rxjs/Observable.js'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
	readonlySet as RoS,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import * as B from '@/core/base64'

import {
	ProductEntityDTO,
	type R_OnProducts,
} from '@/app/contract/read/on-products'

import { log } from '@/data/mock/write/log'
import { executeSql } from '@/data/sqlite/helpers'

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
	ReadonlySet<ProductEntityDTO>
>(RoS.empty, (set, row) => {
	const productRowEither =
		productDecoder.decode(row)

	if (E.isLeft(productRowEither)) {
		log({
			type: 'error',
			message: 'Row could not be parsed',
		})({ prefix: 'D' })()

		return set
	}

	const productRow = productRowEither.right

	if (productRow.name === undefined) {
		log({
			type: 'error',
			message: `Could not parse name of row ${productRow.id}`,
		})({ prefix: 'D' })()
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

	return pipe(
		set,
		RoS.insert(ProductEntityDTO.Eq)(productData),
	)
})

export const products: R_OnProducts<Deps> = pipe(
	R.ask<Deps>(),
	R.map(({ events, db }) =>
		pipe(
			events,
			Rx.switchMap(() =>
				pipe(
					executeSql('SELECT * FROM products')(
						db,
					),
					Rx.defer,
				),
			),
			O.filterMap(OPT.getRight),
		),
	),
	RO.map(columns =>
		pipe(
			Array(columns.rows.length).keys(),
			Array.from<number>,
			RoA.fromArray,
			RoA.map(
				n => columns.rows.item(n) as unknown,
			),
		),
	),
	RO.map(mapData),
)
