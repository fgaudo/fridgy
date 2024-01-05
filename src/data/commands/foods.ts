import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
	either as E,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
	readonlySet as RoS,
	taskEither as TE,
} from 'fp-ts'
import {
	observableEither as OE,
	readerObservable as RO,
} from 'fp-ts-rxjs'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { filterMap } from '@/core/rx'

import { OnFoodsWithDeps } from '@/app/streams/on-foods'
import {
	FoodData,
	foodDataEq,
} from '@/app/types/food'
import { error } from '@/app/types/log'

import { log } from '@/data/commands/log'

interface Deps {
	readonly db: SQLiteDBConnection
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

export const foods: OnFoodsWithDeps<Deps> = pipe(
	R.ask<Deps>(),
	R.map(({ db, events }) =>
		pipe(
			events,
			Rx.switchMap(() =>
				pipe(
					TE.tryCatch(
						() => db.query('SELECT * FROM foods'),
						e =>
							e instanceof Error
								? e
								: new Error('Unknown error'),
					),
					OE.fromTaskEither,
				),
			),
			filterMap(OPT.getRight),
		),
	),
	RO.map(
		columns =>
			(columns.values ?? []) as unknown[],
	),
	RO.map(mapData),
)
