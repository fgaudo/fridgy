import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
	reader as R,
	readonlyArray as ROA,
	readonlySet as ROS,
	readerTaskEither as RTE,
	taskEither as TE
} from 'fp-ts'
import { pipe } from 'fp-ts/function'
import { Ord } from 'fp-ts/string'

import { DeleteFoodsByIdsWithDeps } from '@/app/commands/delete-foods-by-ids'

interface Deps {
	readonly db: SQLiteDBConnection
}

export const deleteFoodsByIds: DeleteFoodsByIdsWithDeps<Deps> = idSet =>
	pipe(
		R.of(idSet),
		R.map(ROS.toReadonlyArray(Ord)),
		R.map(
			ROA.map(i => ({
				statement: 'DELETE * FROM foods where id=?',
				values: [i]
			}))
		),
		R.map(ROA.toArray), // the api wants a mutable array..
		R.chain(
			set =>
				({ db }: Deps) =>
					TE.tryCatch(
						() => db.executeSet(set),
						e => (e instanceof Error ? e : new Error('Unknown error'))
					)
		),
		RTE.map(() => undefined)
	)
