import type Dexie from 'dexie'
import {
	function as F,
	readerTaskEither as RTE,
	task as T,
	taskEither as TE,
} from 'fp-ts'
import { sequenceS } from 'fp-ts/lib/Apply'

import { type Products } from '@/app/interfaces/read/products'

import { decodeData } from '@/data/decoder'

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
						TE.tryCatch(
							() =>
								deps.db.transaction(
									'r',
									deps.db.table(
										productsTable.name,
									),
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
													options.sortBy ===
														'date'
														? productsTable
																.columns
																.expirationDate
														: productsTable
																.columns.name,
												),
									}),
								),
							error =>
								error instanceof Error
									? error
									: new Error(
											'Transaction failed while getting product list',
										),
						),
						RTE.fromTaskEither,
					),
				),
			),
			RTE.map(vars => ({
				items: decodeData(
					vars.results.products as unknown[],
				),
				total: vars.results.total,
			})),
		),
	)
