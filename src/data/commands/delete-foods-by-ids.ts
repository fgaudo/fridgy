import {
	reader as R,
	readerTaskEither as RTE,
	readonlyNonEmptyArray as RoNeA,
	string as S,
} from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'

import * as RoNeS from '@/core/readonly-non-empty-set'

import { R_DeleteFoodsByIds } from '@/app'

import { executeSql } from '@/data/helpers'

interface Deps {
	readonly db: SQLitePlugin.Database
}

export const deleteFoodsByIds: R_DeleteFoodsByIds<Deps> =
	flow(
		RoNeS.toReadonlyNonEmptyArray(S.Ord),
		ids => ({
			tokens: pipe(
				ids,
				RoNeA.map(() => '?'),
				arr => arr.join(','),
			),
			values: ids,
		}),
		R.of,
		R.chain(
			({ values, tokens }) =>
				({ db }: Deps) =>
					executeSql(
						`DELETE * FROM foods WHERE id IN (${tokens})`,
						values,
					)(db),
		),
		RTE.map(() => undefined),
	)
