import * as O from '@fgaudo/fp-ts-rxjs/Observable'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable'
import * as E from 'fp-ts/Either'
import * as OPT from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoS from 'fp-ts/ReadonlySet'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import type { R_OnProducts } from '@/app/streams/on-products'
import {
	type ProductDTO,
	productDataEq,
} from '@/app/types/product'

import { log } from '@/data/commands/log'
import { executeSql } from '@/data/helpers'

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
		RoS.insert(productDataEq<string>())(
			productData,
		),
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
