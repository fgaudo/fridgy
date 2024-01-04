import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
	option as OPT,
	reader as R,
	readonlyArray as RA,
	readonlySet as RoS,
	taskEither as TE
} from 'fp-ts'
import { observableEither as OE, readerObservable as RO } from 'fp-ts-rxjs'
import { isLeft } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { filterMap } from '@/core/rx'

import { Eq, FoodData, FoodsWithDeps } from '@/app/commands/foods'
import { LogType } from '@/app/commands/log'

import { log } from './log'

interface Deps {
	readonly db: SQLiteDBConnection
	readonly events: Rx.Observable<void>
}

export const foods: FoodsWithDeps<Deps> = pipe(
	R.ask<Deps>(),
	R.map(({ db, events }) =>
		pipe(
			events,
			Rx.switchMap(() =>
				pipe(
					TE.tryCatch(
						() => db.query('SELECT * FROM foods'),
						e => (e instanceof Error ? e : new Error('Unknown error'))
					),
					OE.fromTaskEither
				)
			),
			filterMap(OPT.getRight)
		)
	),
	RO.map(columns => (columns.values ?? []) as unknown[]),
	RO.map(element => mapData(element))
)

function mapData(rows: unknown[]): ReadonlySet<FoodData> {
	return pipe(
		rows,
		RA.reduce<unknown, ReadonlySet<FoodData>>(RoS.empty, (set, row) => {
			const id = FoodData.props.id.decode((row as { id: unknown }).id)
			if (isLeft(id)) {
				log(LogType.error, 'Row could not be parsed entirely')
				return set
			}

			const foodData = FoodData.decode(row)

			if (isLeft(foodData)) {
				log(LogType.error, 'Row could not be parsed entirely')

				return pipe(set, RoS.insert(Eq)({ id: id.right, name: '[undefined]' }))
			}

			return pipe(set, RoS.insert(Eq)(foodData.right))
		})
	)
}
