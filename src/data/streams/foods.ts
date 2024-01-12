import {
	observable as O,
	readerObservable as RO,
} from '@fgaudo/fp-ts-rxjs'
import {
	either as E,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
	readonlySet as RoS,
} from 'fp-ts'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import { R_OnFoods } from '@/app/streams/on-foods'
import {
	FoodDTO,
	foodDataEq,
} from '@/app/types/food'
import { error } from '@/app/types/log'

import { log } from '@/data/commands/log'
import { executeSql } from '@/data/helpers'

interface Deps {
	readonly db: SQLitePlugin.Database
	readonly events: Rx.Observable<void>
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
		log(error('Row could not be parsed'))(
			undefined,
		)()

		return set
	}

	const foodRow = foodRowEither.right

	if (foodRow.name === undefined) {
		log(
			error(
				'Could not parse name of row ' +
					foodRow.id,
			),
		)(undefined)()
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
