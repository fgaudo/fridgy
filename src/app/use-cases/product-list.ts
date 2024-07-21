import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	eq as Eq,
	function as F,
	monoid as MO,
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
import * as Rx from 'rxjs'

import * as B from '@/core/base64'
import * as RoNeS from '@/core/readonly-non-empty-set'
import { type R_Transformer } from '@/core/transformer'

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
import type { Log } from '@/app/contract/write/log'

import { products } from '@/data/mock/read/mock-products'

const pipe = F.pipe
const flow = F.flow

export interface ProductModel {
	id: B.Base64
	name: string
	expDate: OPT.Option<
		Readonly<{
			timestamp: number
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
	OrdOldest: MO.concatAll(M)([
		pipe(
			N.Ord,
			OPT.getOrd,
			Ord.reverse,
			Ord.contramap((model: ProductModel) =>
				pipe(
					model.expDate,
					OPT.map(exp => exp.timestamp),
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
} as const

export type Model =
	| { type: 'loading' }
	| {
			type: 'ready'
			products: readonly ProductModel[]
	  }

export type Command = undefined

export interface UseCases {
	products$: OnProducts
	log: Log
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

const sortByOldest: (
	set: ReadonlySet<ProductModel>,
) => readonly ProductModel[] =
	RoS.toReadonlyArray(ProductModel.OrdOldest)

const discardInvalid: (
	set: SEP.Separated<
		ReadonlySet<B.Base64>,
		ReadonlySet<ProductEntity>
	>,
) => ReadonlySet<ProductEntity> = SEP.right

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
		log({ type: 'info', message })

export const transformer: R_Transformer<
	UseCases,
	Command,
	Model
> = () =>
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
					T.fromIO(() => new Date().getDate()),
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
		RO.map(sortByOldest),
		RO.map(
			models =>
				({
					type: 'ready',
					products: models,
				}) as const,
		),
	)
