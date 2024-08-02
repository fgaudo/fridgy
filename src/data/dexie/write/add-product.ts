import type Dexie from 'dexie'
import {
	function as F,
	option as OPT,
	reader as R,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import type { AddProduct } from '@/app/interfaces/write/add-product'
import type { Log } from '@/app/interfaces/write/log'

import { type ProductRow } from '../codec'
import { PRODUCTS_TABLE } from '../schema'

const flow = F.flow
const pipe = F.pipe

interface Deps {
	db: Dexie
	log: Log
}

export const addProduct: (d: Deps) => AddProduct =
	F.flip(
		flow(
			RTE.of,
			RTE.bindTo('product'),
			RTE.chain(({ product }) =>
				R.asks((deps: Deps) =>
					TE.tryCatch(
						() =>
							deps.db
								.table(PRODUCTS_TABLE.name)
								.add({
									name: product.name,
									creation_date: Date.now(),
									expiration_date: pipe(
										product.expiration,
										OPT.match(
											() => 0,
											expiration =>
												expiration.date,
										),
									),
									...pipe(
										product.expiration,
										OPT.match(
											() => ({}),
											expiration => ({
												is_best_before:
													expiration.isBestBefore,
											}),
										),
									),
								} satisfies Omit<
									ProductRow,
									'id'
								>),
						error =>
							error instanceof Error
								? error
								: new Error(
										'Could not add product',
									),
					),
				),
			),
			RTE.map(() => undefined),
		),
	)
