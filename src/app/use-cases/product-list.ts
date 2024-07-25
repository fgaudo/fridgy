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
	string as S,
	separated as SEP,
	task as T,
} from 'fp-ts'
import * as Rx from 'rxjs'

import * as B from '@/core/base64'
import { Controller } from '@/core/controller'

import {
	type Product,
	createProduct,
	expDate,
	isExpired,
	name,
} from '@/domain/product'

import type {
	OnProducts,
	Options,
	ProductEntityDTO,
} from '@/app/interfaces/read/on-products'
import type { Log } from '@/app/interfaces/write/log'

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
	| { status: 'loading' }
	| {
			status: 'ready'
			products: readonly ProductModel[]
			total: number
			offset: number
	  }

export interface UseCases {
	products: OnProducts
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
	foodDTOs: readonly ProductEntityDTO[],
) => SEP.Separated<
	readonly B.Base64[],
	readonly ProductEntity[]
> = RoA.partitionMap(entityDTO =>
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
		readonly B.Base64[],
		readonly ProductEntity[]
	>,
) => readonly ProductEntity[] = SEP.right

const toProductModels = (
	products: readonly ProductEntity[],
) =>
	pipe(
		T.fromIO(() => new Date().getDate()),
		Rx.defer,
		Rx.map(timestamp =>
			pipe(
				products,
				RoA.map(({ id, product }) => ({
					id,
					name: name(product),
					isExpired: isExpired(
						product,
						timestamp,
					),
					expDate: expDate(product),
				})),
			),
		),
	)

export type Sortings = Options['sortBy']

const logInfo =
	(message: string) =>
	({ log }: UseCases) =>
		log({ severity: 'info', message })

type ProductList = (
	init: Options,
) => (
	options: Rx.Observable<Options>,
) => Rx.Observable<Model>

const transformer: (
	deps: UseCases,
) => ProductList = F.flip(init =>
	F.flip(
		flow(
			Rx.startWith(init),
			R.of<UseCases, Rx.Observable<Options>>,
			RO.switchMap(
				flow(
					options => (useCases: UseCases) =>
						useCases.products(options),
					RO.map(result => ({
						result,
					})),
					RO.tap(vars =>
						logInfo(
							`Received ${vars.result.items.length.toString(10)} product entries out of ${vars.result.total.toString(10)}`,
						),
					),
					RO.map(vars => ({
						...vars,
						entitiesWithInvalid:
							toProductEntitiesWithInvalid(
								vars.result.items,
							),
					})),
					RO.tap(
						flow(
							vars => vars.entitiesWithInvalid,
							SEP.left,
							RoA.map(B.toString),
							RoA.map(id =>
								logInfo(
									`Unable to load entity with id ${id}`,
								),
							),
							RIO.sequenceArray,
						),
					),
					RO.map(vars => ({
						...vars,
						entities: discardInvalid(
							vars.entitiesWithInvalid,
						),
					})),
					R.map(
						Rx.switchMap(vars =>
							pipe(
								toProductModels(vars.entities),
								Rx.map(models => ({
									...vars,
									models,
								})),
							),
						),
					),
					RO.map(
						vars =>
							({
								status: 'ready',
								products: vars.models,
								total: vars.result.total,
								offset: vars.result.offset,
							}) satisfies Model,
					),
				),
			),
		),
	),
)

export type ProductListController = (
	options: Options,
) => Controller<Options, Model>

export const controller =
	(deps: UseCases) => (options: Options) =>
		new Controller(transformer(deps)(options))
