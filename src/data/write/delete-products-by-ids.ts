import {
	function as F,
	option as OPT,
	reader as R,
	readerTask as RT,
	readonlyNonEmptyArray as RoNeA,
	string as S,
} from 'fp-ts'

import { toString } from '@/core/base64'
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
		RoNeS.map(S.Eq)(toString),
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
		RT.map(OPT.getLeft),
	)
