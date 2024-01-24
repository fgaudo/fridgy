import * as O from '@fgaudo/fp-ts-rxjs/Observable.js'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	eq as Eq,
	function as F,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
	readonlySet as RoS,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import type { R_OnProducts } from '@/app/contract/read/on-products'
import {
	type ProductDTO,
	productDataEquals,
} from '@/app/contract/read/types/product'

import { executeSql } from '@/data/helpers'
import { log } from '@/data/write/log'

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
	}),
)
const mapData = RoA.reduce<
	unknown,
	ReadonlySet<ProductDTO<string>>
>(RoS.empty, (set, row) => {
	const productRowEither =
		productDecoder.decode(row)

	if (E.isLeft(productRowEither)) {
		log(
			'error',
			'Row could not be parsed',
		)({ prefix: 'D' })()

		return set
	}

	const productRow = productRowEither.right

	if (productRow.name === undefined) {
		log(
			'error',
			'Could not parse name of row ' +
				productRow.id,
		)({ prefix: 'D' })()
	}

	const productData = {
		id: productRow.id,
		name: productRow.name ?? '[undefined]',
	}

	return pipe(
		set,
		RoS.insert(
			Eq.fromEquals(productDataEquals<string>),
		)(productData),
	)
})

export const products: R_OnProducts<
	Deps,
	string
> = pipe(
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
