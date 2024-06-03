import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	eq as Eq,
	function as F,
	number as N,
	ord as Ord,
	reader as R,
	readerIO as RIO,
	readonlyArray as RoA,
	readonlySet as RoS,
	separated as SEP,
	task as T,
} from 'fp-ts'
import * as Rx from 'rxjs'

import * as I from '@/core/id'
import * as RoNeS from '@/core/readonly-non-empty-set'
import { type ViewModel } from '@/core/view-model'

import {
	type Product,
	createProduct,
	expDate,
	isExpired,
	name,
} from '@/domain/product'

import type { OnProducts } from '@/app/contract/read/on-products'
import { type ProductDTO } from '@/app/contract/read/types/product'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type { Log } from '@/app/contract/write/log'

const pipe = F.pipe
const flow = F.flow

export interface ProductModel {
	id: I.Base64
	name: string
	expDate: number
	isExpired: boolean
}

const ProductModel = {
	Eq: Eq.contramap((a: ProductModel) => a.id)(
		I.Eq,
	),
	OrdOldest: pipe(
		N.Ord,
		Ord.contramap(
			(model: ProductModel) => model.expDate,
		),
	),
	OrdNewest: pipe(
		N.Ord,
		Ord.contramap(
			(model: ProductModel) => model.expDate,
		),
		Ord.reverse,
	),
} as const

export interface Model {
	type: 'ready' | 'deleting'
	products: readonly ProductModel[]
}

interface Delete {
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<I.Base64>
}

export type Command = Delete

export interface UseCases {
	products$: OnProducts
	log: Log
	addFailure: AddFailure
}

interface ProductEntity {
	id: I.Base64
	product: Product
}

const ProductEntity = {
	Eq: Eq.contramap(({ id }: ProductEntity) => id)(
		I.Eq,
	),
} as const

const toProductEntitiesWithInvalid: (
	foodDTOs: ReadonlySet<ProductDTO>,
) => SEP.Separated<
	ReadonlySet<I.Base64>,
	ReadonlySet<ProductEntity>
> = RoS.partitionMap(
	I.Eq,
	ProductEntity.Eq,
)(foodDTO =>
	pipe(
		createProduct({
			name: foodDTO.name,
			expDate: foodDTO.expDate.timestamp,
		}),
		E.bimap(
			() => foodDTO.id,
			product =>
				({
					id: foodDTO.id,
					product,
				}) as const,
		),
	),
)

const discardInvalid: (
	set: SEP.Separated<
		ReadonlySet<I.Base64>,
		ReadonlySet<ProductEntity>
	>,
) => ReadonlySet<ProductEntity> = SEP.right

const sortByNewest: (
	set: ReadonlySet<ProductModel>,
) => readonly ProductModel[] =
	RoS.toReadonlyArray(ProductModel.OrdNewest)

const toProductModels = ({
	products,
	timestamp,
}: {
	products: ReadonlySet<ProductEntity>
	timestamp: number
}) =>
	pipe(
		products,
		RoS.map(ProductModel.Eq)(
			({ id, product }) => ({
				id,
				name: name(product),
				isExpired: isExpired(product, timestamp),
				expDate: expDate(product),
			}),
		),
	)

const logInfo =
	(message: string) =>
	({ log }: UseCases) =>
		log('info', message)

function combineLatest2<ENV, A, B>(
	a: RO.ReaderObservable<ENV, A>,
	b: RO.ReaderObservable<ENV, B>,
): R.Reader<ENV, Rx.Observable<[A, B]>> {
	return env => Rx.combineLatest([a(env), b(env)])
}

export const viewModel: ViewModel<
	UseCases,
	Command,
	Model
> = cmd$ =>
	// ON PRODUCTS
	pipe(
		combineLatest2(
			pipe(
				R.asks(
					({ products$ }: UseCases) => products$,
				),
				RO.tap(
					flow(
						RoS.size,
						size => size.toString(10),
						size =>
							logInfo(
								`Received ${size} product entries`,
							),
					),
				),
				RO.map(toProductEntitiesWithInvalid),
				RO.tap(
					flow(
						SEP.left,
						RoS.toReadonlyArray<I.Base64>(
							Ord.trivial,
						),
						RoA.map(I.toString),
						RoA.map(id =>
							logInfo(
								`Unable to load entity with id ${id}`,
							),
						),
						RIO.sequenceArray,
					),
				),
				RO.map(discardInvalid),
				R.map(
					Rx.switchMap(products =>
						pipe(
							T.fromIO(() =>
								new Date().getDate(),
							),
							Rx.defer,
							Rx.map(
								timestamp =>
									({
										products,
										timestamp,
									}) as const,
							),
						),
					),
				),
				RO.map(toProductModels),
				RO.map(sortByNewest),
			),
			pipe(
				R.of(cmd$),
				RO.exhaustMap(() =>
					pipe(
						Rx.of('ready' as const),
						Rx.startWith('deleting' as const),
						R.of,
					),
				),
				R.map(Rx.startWith('ready' as const)),
			),
		),
		RO.map(
			([products, type]) =>
				({
					products,
					type,
				}) satisfies Model,
		),
	)
