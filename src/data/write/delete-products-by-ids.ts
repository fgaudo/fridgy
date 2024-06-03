import {
	function as F,
	reader as R,
	readerTaskEither as RTE,
	readonlyNonEmptyArray as RoNeA,
	string as S,
} from 'fp-ts'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { R_DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'

import { executeSql } from '@/data/helpers'

const pipe = F.pipe
const flow = F.flow

interface Deps {
	db: SQLitePlugin.Database
}

export const deleteProductsByIds: R_DeleteProductsByIds<Deps> =
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
						`DELETE * FROM products WHERE id IN (${tokens})`,
						values,
					)(db),
		),
		RTE.map(() => undefined),
	)
