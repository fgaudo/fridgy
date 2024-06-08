import {
	option as OPT,
	reader as R,
	readerTask as RT,
} from 'fp-ts'

import type * as App from '@/app'

import { products } from '@/data/read/mock-products'
import { log } from '@/data/write/log'

interface Deps {
	//	readonly db: SQLitePlugin.Database
}

export type OverviewController =
	App.OverviewController

export const appUseCases: R.Reader<
	Deps,
	App.UseCases
> = () => ({
	addProduct: () => RT.of(OPT.none)(undefined),
	deleteProductsByIds: RT.of(OPT.none),
	products$: products({}),

	appLog: (type, message) =>
		log(type, message)({ prefix: 'A' }),
})
