import type Dexie from 'dexie'
import {
	function as F,
	option as OPT,
	reader as R,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import type { AddProduct } from '@/app/interfaces/write/add-product'

import { productsTable } from '../schema'

const flow = F.flow
const pipe = F.pipe

interface Deps {
	db: Dexie
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
								.table(productsTable.name)
								.add({
									[productsTable.columns.name]:
										product.name,

									...pipe(
										product.expiration,
										OPT.match(
											() => ({}),
											expiration => ({
												[productsTable.columns
													.expirationDate]:
													expiration.date,
											}),
										),
									),

									...pipe(
										product.expiration,
										OPT.match(
											() => ({}),
											expiration => ({
												[productsTable.columns
													.isBestBefore]:
													expiration.isBestBefore,
											}),
										),
									),

									[productsTable.columns
										.creationDate]:
										new Date().getDate(),
								}),
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
