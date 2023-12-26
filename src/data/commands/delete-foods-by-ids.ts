import { SQLiteDBConnection, capSQLiteSet } from '@capacitor-community/sqlite'
import {
	reader as R,
	readonlyArray as ROA,
	readonlySet as ROS,
	readerTaskEither as RTE
} from 'fp-ts'
import { pipe } from 'fp-ts/function'
import { tryCatch } from 'fp-ts/lib/TaskEither'
import { Ord } from 'fp-ts/string'

import { DeleteFoodsByIdsWithDeps } from '@/app/commands/delete-foods-by-ids'

type Deps = {
	db: SQLiteDBConnection
}

export const deleteFoodsByIds: DeleteFoodsByIdsWithDeps<Deps> = idSet =>
	pipe(
		R.of(idSet),
		R.map(ROS.toReadonlyArray(Ord)),
		R.map(
			ROA.map(i => ({
				statement: 'DELETE * FROM foods where id=?',
				values: [i] as any[]
			}))
		),
		R.map(ROA.toArray), // the api wants a mutable array..
		R.chain(
			set =>
				({ db }: Deps) =>
					tryCatch(
						() => db.executeSet(set),
						e => (e instanceof Error ? e : Error('Unknown error'))
					)
		),
		RTE.map(() => undefined)
	)
