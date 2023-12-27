import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
	option as OPT,
	reader as R,
	readonlyArray as RA,
	taskEither as TE
} from 'fp-ts'
import { observableEither as OE, readerObservable as RO } from 'fp-ts-rxjs'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { filterMap } from '@/core/rx'

import { FoodData, FoodsWithDeps } from '@/app/commands/foods'

interface Deps {
	readonly db: SQLiteDBConnection
	readonly events: Rx.Observable<void>
}

/** TODO */
export const foods: FoodsWithDeps<Deps> = pipe(
	R.ask<Deps>(),
	R.map(({ db, events }) =>
		pipe(
			events,
			Rx.switchMap(() =>
				OE.fromTaskEither(
					TE.tryCatch(
						() => db.query('SELECT * FROM foods'),
						e => (e instanceof Error ? e : new Error('ciasd'))
					)
				)
			),
			filterMap(OPT.getRight)
		)
	),
	RO.map(columns => (columns.values ?? []) as unknown[]),
	RO.map(RA.map(mapData))
)

function mapData(row: unknown): FoodData {
	const rowObj = (row as Record<string, unknown> | undefined) ?? {}
	return { name: (rowObj.name as string | undefined) ?? 'undefined' }
}
