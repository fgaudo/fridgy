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

import { R_OnFoods } from '@/app/streams/on-foods'
import {
	FoodDTO,
	foodDataEq,
} from '@/app/types/food'

import { log } from '@/data/commands/log'
import { executeSql } from '@/data/helpers'

interface Deps {
	db: SQLitePlugin.Database
	events: Rx.Observable<void>
	prefix: string
}

export const foodDecoder = t.readonly(
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
	ReadonlySet<FoodDTO<string>>
>(RoS.empty, (set, row) => {
	const foodRowEither = foodDecoder.decode(row)

	if (E.isLeft(foodRowEither)) {
		log(
			'error',
			'Row could not be parsed',
		)({ prefix: 'D' })()

		return set
	}

	const foodRow = foodRowEither.right

	if (foodRow.name === undefined) {
		log(
			'error',
			'Could not parse name of row ' + foodRow.id,
		)({ prefix: 'D' })()
	}

	const foodData = {
		id: foodRow.id,
		name: foodRow.name ?? '[undefined]',
	}

	return pipe(
		set,
		RoS.insert(foodDataEq<string>())(foodData),
	)
})

export const foods: R_OnFoods<Deps, string> =
	pipe(
		R.ask<Deps>(),
		R.map(({ events, db }) =>
			pipe(
				events,
				Rx.switchMap(() =>
					pipe(
						executeSql('SELECT * FROM foods')(db),
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
