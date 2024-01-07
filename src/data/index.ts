import {
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlySet as RoS,
} from 'fp-ts'
import * as Rx from 'rxjs'

import { deleteFoodsByIds } from '@/data/commands/delete-foods-by-ids'
import { foods } from '@/data/commands/foods'
import { log } from '@/data/commands/log'

export const appUseCases = {
	processes$: R.of(
		Rx.of({ delete: RoS.singleton('') } as const),
	),
	getProcesses: RTE.of(RoS.empty),
	removeProcess: () => RTE.of(void 1),
	enqueueProcess: () => RTE.of(void 1),
	addFailure: () => RT.of(void 1),
	deleteFoodsByIds: deleteFoodsByIds,
	foods$: foods,
	appLog: log,
	uiLog: log,
}
