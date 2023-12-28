import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
	reader as R,
	readonlyArray as ROA,
	readonlySet as ROS,
	readerTaskEither as RTE,
	taskEither as TE
} from 'fp-ts'
import * as Ord from 'fp-ts/Ord'
import { flow } from 'fp-ts/function'

import { DeleteFoodsByIdsWithDeps } from '@/app/commands/delete-foods-by-ids'

interface Deps {
	readonly db: SQLiteDBConnection
}

export const deleteFoodsByIds: DeleteFoodsByIdsWithDeps<Deps> = flow(
	ROS.toReadonlyArray(Ord.trivial),
	ROA.map(id => ({
		statement: 'DELETE * FROM foods where id=?',
		values: [id]
	})),
	ROA.toArray,
	R.of, // the api wants a mutable array..
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
