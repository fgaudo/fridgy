import * as OE from '@fgaudo/fp-ts-rxjs/ObservableEither.js'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	function as F,
	ord as ORD,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import * as Rx from 'rxjs'

import type { OnChangeProcesses } from '@/app/contract/read/on-change-processes'
import type { OnceProcesses } from '@/app/contract/read/once-processes'
import { processesCompare } from '@/app/contract/read/types/process'
import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'
import type { RemoveProcess } from '@/app/contract/write/remove-process'

const pipe = F.pipe

interface Deps<ID> {
	interval: number
	processes$: OnChangeProcesses<ID>
	onceProcesses: OnceProcesses<ID>
	deleteProductsByIds: DeleteProductsByIds<ID>
	removeProcess: RemoveProcess<ID>
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
						? Rx.defer(useCases.onceProcesses)
						: pipe(Rx.of(p), Rx.map(E.right)),
					Rx.map(
						E.map(
							RoS.toReadonlyArray(
								ORD.fromCompare(processesCompare),
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
							useCases.deleteProductsByIds(
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
