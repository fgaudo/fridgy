import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable'
import * as E from 'fp-ts/Either'
import * as OPT from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as R from 'fp-ts/Reader'
import * as RoS from 'fp-ts/ReadonlySet'
import { flip, flow, pipe } from 'fp-ts/function'
import * as EQ from 'fp-ts/lib/Eq'
import * as Rx from 'rxjs'

import * as RoNeS from '@/core/readonly-non-empty-set'
import { type ViewModel } from '@/core/view-model'

import {
	createProduct,
	expDate,
	name,
} from '@/domain/product'

import type { OnChangeProcesses } from '@/app/contract/read/on-change-processes'
import type { OnProducts } from '@/app/contract/read/on-products'
import type { ProcessDTO } from '@/app/contract/read/types/process'
import {
	type ProductDTO,
	productDataEquals,
} from '@/app/contract/read/types/product'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type {
	EnqueueProcess,
	ProcessInputDTO,
} from '@/app/contract/write/enqueue-process'
import type { Log } from '@/app/contract/write/log'

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
export interface UseCases<ID> {
	processes$: OnChangeProcesses<ID>
	enqueueProcess: EnqueueProcess<ID>
	products$: OnProducts<ID>
	log: Log
	addFailure: AddFailure
}

const toProductEntitiesOrFilterOut = <ID>(
	set: ReadonlySet<ProductDTO<ID>>,
) =>
	pipe(
		set,
		RoS.filterMap(
			EQ.fromEquals(productDataEquals<ID>),
		)(productDTO =>
			pipe(
				createProduct(productDTO),
				E.map(product => ({
					id: productDTO.id,
					name: name(product),
					expDate: expDate(product),
				})),
				OPT.getRight,
			),
		),
	)

const toProductModels = <ID>([
	products,
	processes,
]: readonly [
	ReadonlySet<ProductDTO<ID>>,
	ReadonlySet<ProcessDTO<ID>>,
]) =>
	pipe(
		products,
		RoS.map(
			EQ.fromEquals<ProductModel<ID>>(
				(a, b) => a.id === b.id,
			),
		)(product => ({
			...product,
			deleting: pipe(
				processes,
				RoS.filter(
					process => process.type === 'delete',
				),
				RoS.some(process =>
					pipe(
						process.ids,
						RoNeS.toReadonlySet,
						RoS.some(id => product.id === id),
					),
				),
			),
		})),
	)

export const logInfo =
	(message: string) =>
	<ID>({ log }: UseCases<ID>) =>
		log('info', message)
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
					RO.map(
						toProductEntitiesOrFilterOut<ID>,
					),
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
