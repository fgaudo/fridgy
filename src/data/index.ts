import * as ROE from '@fgaudo/fp-ts-rxjs/ReaderObservableEither.js'
import {
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlySet as RoS,
} from 'fp-ts'
import * as Rx from 'rxjs'

import type * as App from '@/app'

import { products } from '@/data/read/mock-products'
import { deleteProductsByIds } from '@/data/write/delete-products-by-ids'
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
	addProduct: () => RTE.of(undefined)(undefined),
	processes$: R.of(
		Rx.scheduled(
			Rx.of(RoS.empty),
			Rx.asapScheduler,
		),
	)(undefined),
	getProcesses: RTE.of(RoS.empty)(undefined),
	removeProcess: () => RTE.of(void 1)(undefined),
	enqueueProcess: () => RTE.of(void 1)(undefined),
	addFailure: () => RT.of(void 1)(undefined),
	deleteProductsByIds: RTE.of(undefined),
	products$: products({}),

	appLog: (type, message) =>
		log(type, message)({ prefix: 'A' }),
})
