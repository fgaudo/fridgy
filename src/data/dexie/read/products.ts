import * as Match from '@effect/match'
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
												.offset(options.offset)
												.sortBy(
													pipe(
														Match.value(
															options.sortBy,
														),
														Match.when(
															'a-z',
															() =>
																productsTable
																	.columns.name,
														),
														Match.when(
															'creationDate',
															() =>
																productsTable
																	.columns
																	.creationDate,
														),
														Match.when(
															'expirationDate',
															() =>
																productsTable
																	.columns
																	.expirationDate,
														),
														Match.exhaustive,
													),
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
