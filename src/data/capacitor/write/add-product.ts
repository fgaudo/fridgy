import {
	function as F,
	option as OPT,
	readerTaskEither as RTE,
} from 'fp-ts'

import type { AddProduct } from '@/app/interfaces/write/add-product'
import type { Log } from '@/app/interfaces/write/log'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'

const flow = F.flow

interface Deps {
	db: FridgySqlitePlugin
	log: Log
}

const addProductCommand =
	(product: {
		name: string
		creationDate: number
		expirationDate?: number
	}) =>
	(deps: Deps) =>
	() =>
		deps.db.addProduct({ product })

export const addProduct: (d: Deps) => AddProduct =
	F.flip(
		flow(
			RTE.of,
			RTE.bindTo('product'),
			RTE.chain(({ product }) =>
				addProductCommand({
					name: product.name,
					creationDate: product.creationDate,
					...(OPT.isSome(product.expirationDate)
						? {
								expirationDate:
									product.expirationDate.value,
							}
						: {}),
				}),
			),
			RTE.map(() => undefined),
		),
	)
