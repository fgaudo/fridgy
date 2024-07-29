import type Dexie from 'dexie'
import {
	function as F,
	readerTaskEither as RTE,
	readonlyArray as RoA,
	task as T,
} from 'fp-ts'
import { sequenceS } from 'fp-ts/lib/Apply'

import { type Products } from '@/app/interfaces/read/products'

import { productsTable } from '../schema'

const pipe = F.pipe

interface Deps {
	db: Dexie
	prefix: string
}

export const products: (deps: Deps) => Products =
	F.flip(
		F.flow(
			RTE.of,
			RTE.bindTo('options'),
			RTE.bind('results', ({ options }) =>
				RTE.asksReaderTaskEither((deps: Deps) =>
					pipe(
						() =>
							deps.db.transaction(
								'r',
								deps.db.table(productsTable.name),
								sequenceS(T.ApplyPar)({
									total: () =>
										deps.db
											.table(productsTable.name)
											.count(),
									products: () =>
										deps.db
											.table(productsTable.name)
											.limit(25)
											.offset(options.offset)
											.sortBy(
												options.sortBy === 'date'
													? productsTable.columns
															.expirationDate
													: productsTable.columns
															.name,
											),
								}),
							),
						RTE.fromTask,
					),
				),
			),

			RTE.bindW(
				'products',
				({ results: [{ rows }] }) =>
					pipe(
						Array(rows.length).keys(),
						Array.from<number>,
						RoA.fromArray,
						RoA.map(n => rows.item(n) as unknown),
						RTE.right,
					),
			),
			RTE.map(vars => ({
				items: decodeData(vars.products),
				total: decodeTotal(vars.total),
			})),
		),
	)
