import {
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlySet as RoS,
} from 'fp-ts'
import { Reader } from 'fp-ts/Reader'
import { flip } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { AppUseCases } from '@/app'

import { deleteFoodsByIds } from '@/data/commands/delete-foods-by-ids'
import { foods } from '@/data/commands/foods'
import { log } from '@/data/commands/log'

interface Deps {
	readonly db: SQLitePlugin.Database
}

export const appUseCases: Reader<
	Deps,
	AppUseCases
> = ({ db }: Deps) => ({
	processes$: R.of(
		Rx.of({ delete: RoS.singleton('') } as const),
	)(undefined),
	getProcesses: RTE.of(RoS.empty)(undefined),
	removeProcess: () => RTE.of(void 1)(undefined),
	enqueueProcess: () => RTE.of(void 1)(undefined),
	addFailure: () => RT.of(void 1)(undefined),
	deleteFoodsByIds: flip(deleteFoodsByIds)({
		db,
	}),
	foods$: foods({ events: Rx.of(), db }),
	appLog: flip(log)(undefined),
	uiLog: flip(log)(undefined),
})
