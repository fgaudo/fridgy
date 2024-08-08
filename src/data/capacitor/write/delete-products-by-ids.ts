import {
	function as F,
	ord as Ord,
	readerTaskEither as RTE,
	readonlyNonEmptyArray as RoNeA,
} from 'fp-ts'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { Log } from '@/app/interfaces/write/log'
import type { DeleteProductsByIds } from '@/app/use-cases/delete-products-by-ids'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'

interface Deps {
	db: FridgySqlitePlugin
	log: Log
}

const flow = F.flow
const pipe = F.pipe

export const deleteProductsByIds: (
	deps: Deps,
) => DeleteProductsByIds = F.flip(
	flow(
		RTE.of,
		RTE.bind(
			'ids',
			flow(
				RoNeS.toReadonlyNonEmptyArray<string>(
					Ord.trivial,
				),
				RoNeA.map(id => parseInt(id, 10)),
				RTE.of,
			),
		),
		RTE.chain(({ ids }) =>
			pipe(
				RTE.ask<Deps>(),
				RTE.chainTaskEitherK(
					deps => () =>
						deps.db.deleteProductsByIds({ ids }),
				),
			),
		),
	),
)
