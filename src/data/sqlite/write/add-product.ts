import {
	function as F,
	option as OPT,
	readerTask as RT,
	readerTaskEither as RTE,
} from 'fp-ts'

import type { AddProduct } from '@/app/interfaces/write/add-product'

import { executeSql } from '@/data/sqlite/helpers'

const flow = F.flow

interface Deps {
	db: SQLitePlugin.Database
}

export const addProduct: (d: Deps) => AddProduct =
	F.flip(
		flow(
			RTE.of,
			RTE.chain(
				product => (deps: Deps) =>
					executeSql(
						'INSERT INTO products(id, name, expDate) VALUES(id, ?, ?)',
						[product.name, product.expDate],
					)(deps.db),
			),
			RT.map(OPT.getLeft),
		),
	)
