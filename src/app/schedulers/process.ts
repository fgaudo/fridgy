import {
	observableEither as OE,
	readerObservable as RO,
} from '@fgaudo/fp-ts-rxjs'
import {
	either as E,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'
import { RemoveProcess } from '@/app/commands/remove-process'
import { GetProcesses } from '@/app/queries/get-processes'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { createProcessesOrd } from '@/app/types/process'

interface Deps<ID> {
	readonly interval: number
	readonly processes$: OnChangeProcesses<ID>
	readonly getProcesses: GetProcesses<ID>
	readonly deleteFoodsByIds: DeleteFoodsByIds<ID>
	readonly removeProcess: RemoveProcess<ID>
}

export function createScheduler<ID>(): R.Reader<
	Deps<ID>,
	Rx.Observable<unknown>
> {
	return pipe(
		R.asks((deps: Deps<ID>) =>
			pipe(
				Rx.interval(deps.interval),
				Rx.startWith(0),
			),
		),
		R.chain(
			flip(deps => Rx.mergeWith(deps.processes$)),
		),
		RO.exhaustMap(
			p => (useCases: Deps<ID>) =>
				pipe(
					typeof p === 'number'
						? Rx.defer(useCases.getProcesses)
						: pipe(Rx.of(p), Rx.map(E.right)),
					Rx.map(
						E.map(
							RoS.toReadonlyArray(
								createProcessesOrd(),
							),
						),
					),
					OE.mergeMapW(processes =>
						pipe(
							Rx.from(processes),
							Rx.map(E.right),
						),
					),
					OE.mergeMapW(process =>
						pipe(
							useCases.deleteFoodsByIds(
								process.ids,
							),
							Rx.defer,
							Rx.map(() => E.right(process)),
						),
					),
					OE.mergeMap(process =>
						pipe(
							useCases.removeProcess(process.id),
							Rx.defer,
						),
					),
				),
		),
	)
}
