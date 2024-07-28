import {
	function as F,
	option as OPT,
	ord as Ord,
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlyNonEmptyArray as RoNeA,
} from 'fp-ts'
import { toUint8Array } from 'js-base64'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { DeleteProductsByIds } from '@/app/interfaces/write/delete-products-by-ids'

import { executeSql } from '@/data/sqlite/helpers'

const pipe = F.pipe
const flow = F.flow

interface Deps {
	db: SQLitePlugin.Database
}

export const deleteProductsByIds: (
	deps: Deps,
) => DeleteProductsByIds = F.flip(
	flow(
		RoNeS.toReadonlyNonEmptyArray<string>(
			Ord.trivial,
		),
		RoNeA.map(BigInt),
		ids => ({
			tokens: pipe(
				ids,
				RoNeA.map(() => '?'),
				arr => arr.join(','),
			),
			values: ids,
		}),
		R.of,
		R.chain(({ values, tokens }) =>
			pipe(
				executeSql(
					`DELETE * FROM products WHERE id IN (${tokens})`,
					values,
				),
				R.local((deps: Deps) => deps.db),
			),
		),
		RT.map(OPT.getLeft),
	),
)
