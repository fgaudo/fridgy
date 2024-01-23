import * as O from '@fgaudo/fp-ts-rxjs/Observable'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable'
import * as E from 'fp-ts/Either'
import * as OPT from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as Ordering from 'fp-ts/Ordering'
import * as R from 'fp-ts/Reader'
import * as RoS from 'fp-ts/ReadonlySet'
import * as T from 'fp-ts/Task'
import {
	flip,
	identity,
	pipe,
} from 'fp-ts/function'
import * as Eq from 'fp-ts/lib/Eq'
import * as Rx from 'rxjs'

import * as RoNeS from '@/core/readonly-non-empty-set'
import { type ViewModel } from '@/core/view-model'

import {
	type Product,
	createProduct,
	expDate,
	isExpired,
	name,
} from '@/domain/product'

import type { OnChangeProcesses } from '@/app/contract/read/on-change-processes'
import type { OnProducts } from '@/app/contract/read/on-products'
import type { ProcessDTO } from '@/app/contract/read/types/process'
import { type ProductDTO } from '@/app/contract/read/types/product'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type {
	EnqueueProcess,
	ProcessInputDTO,
} from '@/app/contract/write/enqueue-process'
import type { Log } from '@/app/contract/write/log'

export interface ProductModel<ID> {
	id: ID
	name: string
	expDate: number
	deleting: boolean
	isExpired: boolean
}

export interface Init {
	type: 'init'
}

export interface Model<ID> {
	type: 'ready'
	products: readonly ProductModel<ID>[]
}

interface Delete<ID> {
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<ID>
}

export type Command<ID> = Delete<ID>

export interface UseCases<ID> {
	processes$: OnChangeProcesses<ID>
	enqueueProcess: EnqueueProcess<ID>
	products$: OnProducts<ID>
	log: Log
	addFailure: AddFailure
}

const toProducts = <ID>(
	foodDTOs: ReadonlySet<ProductDTO<ID>>,
) =>
	pipe(
		foodDTOs,
		RoS.map(
			OPT.getEq(
				Eq.fromEquals<{
					id: ID
					product: Product
				}>((a, b) => a.id === b.id),
			),
		)(foodDTO =>
			pipe(
				createProduct(foodDTO),
				E.map(
					product =>
						({
							id: foodDTO.id,
							product: product,
						}) as const,
				),
				OPT.getRight,
			),
		),
	)

const filterInvalid = <ID>(
	set: ReadonlySet<
		OPT.Option<{ id: ID; product: Product }>
	>,
) =>
	pipe(
		set,
		RoS.filterMap(
			Eq.fromEquals<{
				id: ID
				product: Product
			}>((a, b) => a.id === b.id),
		)(identity),
	)

const sortByExpDate = <ID>(
	set: ReadonlySet<ProductModel<ID>>,
) =>
	pipe(
		set,
		RoS.toReadonlyArray(
			Ord.fromCompare(
				(
					a: ProductModel<ID>,
					b: ProductModel<ID>,
				) => Ordering.sign(a.expDate - b.expDate),
			),
		),
	)

const toProductModels = <ID>({
	products,
	processes,
	timestamp,
}: {
	products: ReadonlySet<{
		id: ID
		product: Product
	}>
	processes: ReadonlySet<ProcessDTO<ID>>
	timestamp: number
}) =>
	pipe(
		products,
		RoS.map(
			Eq.fromEquals<ProductModel<ID>>(
				(a, b) => a.id === b.id,
			),
		)(({ id, product }) => ({
			id,
			name: name(product),
			isExpired: isExpired(product, timestamp),
			expDate: expDate(product),
			deleting: pipe(
				processes,
				RoS.filter(
					process => process.type === 'delete',
				),
				RoS.some(process =>
					pipe(
						process.ids,
						RoNeS.toReadonlySet,
						RoS.some(
							productId => productId === id,
						),
					),
				),
			),
		})),
	)

const logInfo =
	(message: string) =>
	<ID>({ log }: UseCases<ID>) =>
		log('info', message)

interface OnProductsDeps<ID> {
	processes$: OnChangeProcesses<ID>
	products$: OnProducts<ID>
	log: Log
}

const onProducts = <ID>() =>
	pipe(
		R.asks(
			({ products$ }: OnProductsDeps<ID>) =>
				products$,
		),
		RO.tap(
			products =>
				logInfo(
					`Received ${products.size} product entries`,
				)<ID>,
		),
		RO.map(toProducts),
		RO.map(filterInvalid),
		R.chain(
			flip(({ processes$ }: UseCases<ID>) =>
				Rx.combineLatestWith(processes$),
			),
		),
		R.map(
			Rx.switchMap(([products, processes]) =>
				pipe(
					T.fromIO(() => new Date().getDate()),
					Rx.defer,
					Rx.map(
						timestamp =>
							({
								products,
								processes,
								timestamp,
							}) as const,
					),
				),
			),
		),
		RO.map(toProductModels),
		RO.map(sortByExpDate),
		RO.map(
			products =>
				({
					products: products,
					type: 'ready',
				}) satisfies Model<ID>,
		),
	)

const onDelete = <ID>(
	cmd$: Rx.Observable<Delete<ID>>,
) =>
	pipe(
		R.of(cmd$),
		RO.tap(
			() =>
				logInfo(`Received delete command`)<ID>,
		),
		RO.map(
			del =>
				({
					type: 'delete',
					ids: del.ids,
				}) satisfies ProcessInputDTO<ID>,
		),
		RO.mergeMap(process =>
			pipe(
				R.asks(
					({ enqueueProcess }: UseCases<ID>) =>
						enqueueProcess(process),
				),
				R.map(Rx.defer),
			),
		),
		RO.tap(() =>
			logInfo(`Delete command enqueued`),
		),
		R.map(Rx.ignoreElements()),
	)

const commands = {
	delete: <ID>(
		cmd$: Rx.Observable<Command<ID>>,
	) =>
		pipe(
			cmd$,
			O.filterMap((cmd: Command<ID>) =>
				cmd.type === 'delete'
					? OPT.some(cmd)
					: OPT.none,
			),
		),
}

export function createViewModel<ID>(): ViewModel<
	UseCases<ID>,
	Command<ID>,
	Model<ID>,
	Init
> {
	return {
		transformer: cmd$ => {
			cmd$ = pipe(
				cmd$,
				Rx.observeOn(Rx.asyncScheduler),
			)

			return pipe(
				RO.merge<
					UseCases<ID>,
					[Model<ID>, never]
				>(
					onProducts(),
					onDelete(commands.delete(cmd$)),
				),
				R.local(
					deps =>
						({
							products$: Rx.scheduled(
								deps.products$,
								Rx.asapScheduler,
							),
							processes$: Rx.scheduled(
								deps.processes$,
								Rx.asapScheduler,
							),
							enqueueProcess: deps.enqueueProcess,
							log: deps.log,
							addFailure: deps.addFailure,
						}) satisfies UseCases<ID>,
				),
			)
		},

		init: {
			type: 'init',
		},
	}
}
