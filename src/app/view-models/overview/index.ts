import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable'
import * as Ord from 'fp-ts/Ord'
import * as R from 'fp-ts/Reader'
import * as RoS from 'fp-ts/ReadonlySet'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import * as RoNeS from '@/core/readonly-non-empty-set'
import { type ViewModel } from '@/core/view-model'

import { type ProcessInputDTO } from '@/app/types/process'

/* eslint-disable import/no-restricted-paths */
import {
	type UseCases,
	logInfo,
	toProductEntitiesOrFilterOut,
	toProductModels,
} from './_impl'

/* eslint-enable import/no-restricted-paths */

export interface ProductModel<ID> {
	id: ID
	name: string
	deleting: boolean
}

export interface Init {
	type: 'init'
}

export interface Model<ID> {
	type: 'ready'
	products: readonly ProductModel<ID>[]
}

export interface Command<ID> {
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<ID>
}

export function createViewModel<ID>(): ViewModel<
	UseCases<ID>,
	Command<ID>,
	Model<ID>,
	Init
> {
	return {
		transformer: cmd$ =>
			RO.merge(
				// On products case
				pipe(
					R.asks(
						(deps: UseCases<ID>) =>
							deps.products$,
					),
					RO.tap(products =>
						logInfo(
							`Received ${products.size} product entries`,
						),
					),
					RO.map(toProductEntitiesOrFilterOut),
					R.chain(
						flip(({ processes$ }: UseCases<ID>) =>
							Rx.combineLatestWith(processes$),
						),
					),
					RO.map(toProductModels),
					RO.map(
						RoS.toReadonlyArray(
							Ord.fromCompare(() => 0),
						),
					),
					RO.map(
						products =>
							({
								products: products,
								type: 'ready',
							}) satisfies Model<ID>,
					),
				),
				// On Delete command case
				pipe(
					cmd$,
					R.of,
					RO.tap(
						() =>
							logInfo(
								`Received delete command`,
							)<ID>,
					),
					RO.map(
						del =>
							({
								type: 'delete',
								ids: del.ids,
							}) satisfies ProcessInputDTO<ID>,
					),
					RO.mergeMap(
						flip(({ enqueueProcess }) =>
							flow(enqueueProcess, Rx.defer),
						),
					),
					RO.tap(() =>
						logInfo(`Delete command enqueued`),
					),
					R.map(Rx.ignoreElements()),
				),
			),

		init: {
			type: 'init',
		},
	}
}
