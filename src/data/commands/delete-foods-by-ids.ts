import {
	ord as Ord,
	reader as R,
	readonlyArray as ROA,
	readonlySet as ROS,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'
import { flow } from 'fp-ts/function'

import { R_DeleteFoodsByIds } from '@/app'

interface Deps {
	readonly db: SQLitePlugin.Database
}

export const deleteFoodsByIds: R_DeleteFoodsByIds<Deps> =
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
			set => (deps: Deps) =>
				TE.tryCatch(
					() => {
						throw new Error('asd')
					},
					e =>
						e instanceof Error
							? e
							: new Error('Unknown error'),
				),
		),
		RTE.map(() => undefined),
	)
