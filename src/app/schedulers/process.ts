import {
	either as E,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as OE from '@/core/observable-either'
import * as RO from '@/core/reader-observable'

import { DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'
import { RemoveProcess } from '@/app/commands/remove-process'
import { GetProcesses } from '@/app/queries/get-processes'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { processesOrd } from '@/app/types/process'

interface Deps {
	readonly interval: number
	readonly processes$: OnChangeProcesses
	readonly getProcesses: GetProcesses
	readonly deleteFoodsByIds: DeleteFoodsByIds
	readonly removeProcess: RemoveProcess
}

export const scheduler: R.Reader<
	Deps,
	Rx.Observable<unknown>
> = pipe(
	R.asks((deps: Deps) =>
		Rx.interval(deps.interval),
	),
	R.chain(
		flip(deps => Rx.mergeWith(deps.processes$)),
	),
	RO.exhaustMap(
		p => (useCases: Deps) =>
			pipe(
				typeof p === 'number'
					? Rx.defer(useCases.getProcesses)
					: pipe(Rx.of(p), Rx.map(E.right)),
				Rx.map(
					E.map(
						RoS.toReadonlyArray(processesOrd),
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
