import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	eq as Eq,
	function as F,
	number as N,
	option as OPT,
	ord as Ord,
	reader as R,
	readerIO as RIO,
	readonlyArray as RoA,
	readonlySet as RoS,
	string as S,
	separated as SEP,
	task as T,
} from 'fp-ts'
import { concatAll } from 'fp-ts/lib/Monoid'
import * as Rx from 'rxjs'

import * as B from '@/core/base64'
import * as RoNeS from '@/core/readonly-non-empty-set'
import { type ViewModel } from '@/core/view-model'

import {
	type Product,
	createProduct,
	expDate,
	isExpired,
	name,
} from '@/domain/product'

import type {
	OnProducts,
	ProductEntityDTO,
} from '@/app/contract/read/on-products'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type { Log } from '@/app/contract/write/log'

const pipe = F.pipe
const flow = F.flow

export interface ProductModel {
	id: B.Base64
	name: string
	expDate: OPT.Option<
		Readonly<{
			expDate: number
			isBestBefore: boolean
		}>
	>
	isExpired: boolean
}

const M = Ord.getMonoid<ProductModel>()

const ProductModel = {
	Eq: Eq.contramap((a: ProductModel) => a.id)(
		B.Base64.Eq,
	),
	OrdOldest: concatAll(M)([
		pipe(
			N.Ord,
			OPT.getOrd,
			Ord.contramap((model: ProductModel) =>
				pipe(
					model.expDate,
					OPT.map(exp => exp.expDate),
				),
			),
		),
		pipe(
			S.Ord,
			Ord.contramap(
				(model: ProductModel) => model.name,
			),
		),
	]),
	OrdNewest: concatAll(M)([
		pipe(
			N.Ord,
			OPT.getOrd,
			Ord.contramap((model: ProductModel) =>
				pipe(
					model.expDate,
					OPT.map(exp => exp.expDate),
				),
			),
			Ord.reverse,
		),
		pipe(
			S.Ord,
			Ord.contramap(
				(model: ProductModel) => model.name,
			),
		),
	]),
} as const

export interface Model {
	type: 'ready' | 'deleting'
	products: readonly ProductModel[]
}

interface Delete {
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<B.Base64>
}

export type Command = Delete

export interface UseCases {
	products$: OnProducts
	log: Log
	addFailure: AddFailure
}

interface ProductEntity {
	id: B.Base64
	product: Product
}

const ProductEntity = {
	Eq: Eq.contramap(({ id }: ProductEntity) => id)(
		B.Base64.Eq,
	),
} as const

const toProductEntitiesWithInvalid: (
	foodDTOs: ReadonlySet<ProductEntityDTO>,
) => SEP.Separated<
	ReadonlySet<B.Base64>,
	ReadonlySet<ProductEntity>
> = RoS.partitionMap(
	B.Base64.Eq,
	ProductEntity.Eq,
)(entityDTO =>
	pipe(
		createProduct({
			name: entityDTO.product.name,
			expDate: entityDTO.product.expDate,
		}),
		E.bimap(
			() => entityDTO.id,
			product =>
				({
					id: entityDTO.id,
					product,
				}) as const,
		),
	),
)

const discardInvalid: (
	set: SEP.Separated<
		ReadonlySet<B.Base64>,
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
						RoS.toReadonlyArray<B.Base64>(
							Ord.trivial,
						),
						RoA.map(B.toString),
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
