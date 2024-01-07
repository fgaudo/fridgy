import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import {
	ord as Ord,
	reader as R,
	readonlyArray as ROA,
	readonlySet as ROS,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'
import { flow } from 'fp-ts/function'

import { DeleteFoodsByIds } from '@/app'

interface Deps {
	readonly db: SQLiteDBConnection
}

export const deleteFoodsByIds: DeleteFoodsByIds<Deps> =
	flow(
		ids =>
			typeof ids === 'string'
				? ROS.singleton(ids)
				: ids,
		ROS.toReadonlyArray(Ord.fromCompare(() => 0)),
		ROA.map(id => ({
			statement: 'DELETE * FROM foods where id=?',
			values: [id],
		})),
		ROA.toArray, // the api wants a mutable array..
		R.of,
		R.chain(
			set =>
				({ db }: Deps) =>
					TE.tryCatch(
						() => db.executeSet(set),
						e =>
							e instanceof Error
								? e
								: new Error('Unknown error'),
					),
		),
		RTE.map(() => undefined),
	)
