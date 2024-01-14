import { fromEquals } from 'fp-ts/Eq'
import * as R from 'fp-ts/Reader'
import { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RoS from 'fp-ts/ReadonlySet'
import { pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { AppUseCases } from '@/app'

import { deleteFoodsByIds } from '@/data/commands/delete-foods-by-ids'
import { log } from '@/data/commands/log'
import { foods } from '@/data/streams/foods'

interface Deps {
	//	readonly db: SQLitePlugin.Database
}

export const appUseCases: Reader<
	Deps,
	AppUseCases<string>
> = () => ({
	addFood: () => RTE.of(undefined)(undefined),
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
	deleteFoodsByIds: RTE.of(undefined),
	foods$: pipe(
		Rx.timer(2000),
		Rx.map(() =>
			RoS.fromReadonlyArray(
				fromEquals(
					(
						a: { name: string; id: string },
						b: { name: string; id: string },
					) => a.id === b.id,
				),
			)([
				{ id: '1', name: 'ciao' },
				{ id: '2', name: 'lol' },
			]),
		),
	),
	appLog: (type, message) =>
		log(type, message)({ prefix: 'A' }),
	uiLog: (type, message) =>
		log(type, message)({ prefix: 'U' }),
})
