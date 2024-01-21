import * as R from 'fp-ts/Reader'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RoS from 'fp-ts/ReadonlySet'
import * as Rx from 'rxjs'

import type * as App from '@/app'

import { products } from '@/data/read/mock-products'
import { deleteProductsByIds } from '@/data/write/delete-products-by-ids'
import { log } from '@/data/write/log'

interface Deps {
	//	readonly db: SQLitePlugin.Database
}

type ID = string

export type OverviewController =
	App.OverviewController<ID>

export const appUseCases: Reader<
	Deps,
	App.UseCases<ID>
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
