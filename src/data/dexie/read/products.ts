import {
	function as F,
	readerTaskEither as RTE,
	readonlyArray as RoA,
	taskEither as TE,
} from 'fp-ts'

import { type Products } from '@/app/interfaces/read/products'

import type { FridgyDexie } from '../dexie'

const pipe = F.pipe

interface Deps {
	db: FridgyDexie
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
									deps.db.products,
									() => {
										return Promise.all([
											deps.db.products.count(),
											deps.db.products
												.limit(30)
												.offset(options.offset)
												.sortBy('expDate'),
										])
									},
								),
							e => e,
						),
						RTE.fromTaskEither,
					),
				),
			),
			RTE.bindW(
				'total',
				({ results: [, { rows }] }) =>
					pipe(
						rows,
						RTE.fromPredicate(
							rows => rows.length === 1,
							rows =>
								new Error(
									`total has ${rows.length.toString(10)} rows`,
								),
						),
						RTE.map(
							total => total.item(0) as unknown,
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
