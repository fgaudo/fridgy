import {
	function as F,
	option as OPT,
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	task as T,
	taskOption as TO,
} from 'fp-ts'

import type { R_AddProduct } from '@/app/contract/write/add-product'

import { executeSql } from '@/data/sqlite/helpers'

const pipe = F.pipe

const flow = F.flow

interface Deps {
	db: SQLitePlugin.Database
}

export const addProduct: R_AddProduct<Deps> =
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
	)
