import {
	either as E,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
	readonlySet as RoS,
} from 'fp-ts'
import { pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import * as RO from '@/core/reader-observable'
import { filterMap } from '@/core/rx'

import { R_OnFoods } from '@/app'
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

const mapData = RoA.reduce<
	unknown,
	ReadonlySet<FoodDTO>
>(RoS.empty, (set, row) => {
	const foodRowEither = FoodDTO.decode(row)

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
		RoS.insert(foodDataEq)(foodData),
	)
})

export const foods: R_OnFoods<Deps> = pipe(
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
			filterMap(OPT.getRight),
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
