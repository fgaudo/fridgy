import {
	either as E,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
	readonlySet as RoS,
	taskEither as TE,
} from 'fp-ts'
import { pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import * as RO from '@/core/reader-observable'
import { filterMap } from '@/core/rx'

import { R_OnFoods } from '@/app'
import {
	FoodData,
	foodDataEq,
} from '@/app/types/food'
import { error } from '@/app/types/log'

import { log } from '@/data/commands/log'

interface Deps {
	readonly db: SQLitePlugin.Database
	readonly events: Rx.Observable<void>
}

const mapData = RoA.reduce<
	unknown,
	ReadonlySet<FoodData>
>(RoS.empty, (set, row) => {
	const foodRowEither = FoodData.decode(row)

	if (E.isLeft(foodRowEither)) {
		log(error('Row could not be parsed'))

		return set
	}

	const foodRow = foodRowEither.right

	if (foodRow.name === undefined) {
		log(
			error(
				'Could not parse name of row ' +
					foodRow.id,
			),
		)
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
	R.map(({ events }) =>
		pipe(
			events,
			Rx.switchMap(() =>
				pipe(
					TE.tryCatch(
						() => {
							throw new Error('asd')
						},
						e =>
							e instanceof Error
								? e
								: new Error('Unknown error'),
					),
					Rx.defer,
				),
			),
			filterMap(OPT.getRight),
		),
	),
	RO.map(
		columns =>
			(
				columns as
					| { values: unknown[] }
					| undefined
			)?.values ?? [],
	),
	RO.map(mapData),
)
