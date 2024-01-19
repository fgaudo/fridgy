import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RoNeA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { R_DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'

import { executeSql } from '@/data/helpers'

interface Deps {
	db: SQLitePlugin.Database
}

export const deleteFoodsByIds: R_DeleteFoodsByIds<
	Deps,
	string
> = flow(
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
