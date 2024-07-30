import type Dexie from 'dexie'
import {
	function as F,
	nonEmptyArray as NeA,
	ord as Ord,
	reader as R,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { DeleteProductsByIds } from '@/app/interfaces/write/delete-products-by-ids'

import { productsTable } from '../schema'

const pipe = F.pipe
const flow = F.flow

interface Deps {
	db: Dexie
}

export const deleteProductsByIds: (
	deps: Deps,
) => DeleteProductsByIds = F.flip(
	flow(
		RTE.of,
		RTE.bindTo('ids'),
		RTE.bind('array', ({ ids }) =>
			pipe(
				ids,
				RoNeS.toReadonlyNonEmptyArray<string>(
					Ord.trivial,
				),
				NeA.fromReadonlyNonEmptyArray,
				NeA.map(number => parseInt(number, 10)),
				RTE.of,
			),
		),
		RTE.chain(({ array }) =>
			pipe(
				R.asks((deps: Deps) =>
					TE.tryCatch(
						() =>
							deps.db
								.table(productsTable.name)
								.bulkDelete(array),
						error =>
							error instanceof Error
								? error
								: new Error(
										'There was a problem deleting all products',
									),
					),
				),
			),
		),
	),
)
