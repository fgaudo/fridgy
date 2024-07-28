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
	readerTaskEither as RTE,
	readonlyArray as RoA,
	string as S,
	separated as SEP,
	task as T,
	taskEither as TE,
} from 'fp-ts'

import {
	type Product,
	createProduct,
	expDate,
	isExpired,
	name,
} from '@/domain/product'

import type {
	Options,
	ProductEntityDTO,
	Products,
} from '@/app/interfaces/read/products'
import type { Log } from '@/app/interfaces/write/log'

const pipe = F.pipe
const flow = F.flow

export interface ProductModel {
	id: string
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
		S.Eq,
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

export interface UseCases {
	products: Products
	log: Log
}

interface ProductEntity {
	id: string
	product: Product
}

const toProductEntitiesWithInvalid: (
	foodDTOs: readonly ProductEntityDTO[],
) => SEP.Separated<
	readonly string[],
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
		readonly string[],
		readonly ProductEntity[]
	>,
) => readonly ProductEntity[] = SEP.right

const toProductModels: (
	products: readonly ProductEntity[],
) => T.Task<readonly ProductModel[]> = products =>
	pipe(
		T.fromIO(() => new Date().getDate()),
		T.map(timestamp =>
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

const logInfo: (
	message: string,
) => RIO.ReaderIO<UseCases, void> =
	message =>
	({ log }) =>
		log({ severity: 'info', message })

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logError =
	(message: string) =>
	({ log }: UseCases) =>
		log({ severity: 'error', message })

export type ProductList = (
	init: Options,
) => TE.TaskEither<
	string,
	{
		total: number
		models: readonly ProductModel[]
	}
>

export const useCase: (
	deps: UseCases,
) => ProductList = F.flip(
	flow(
		RTE.of,
		RTE.bindTo('options'),
		RTE.bind('result', ({ options }) =>
			R.asks((useCases: UseCases) =>
				useCases.products(options),
			),
		),
		RTE.tapReaderIO(({ result }) =>
			logInfo(
				`Received ${result.items.length.toString(10)} product entries out of ${result.total.toString(10)}`,
			),
		),
		RTE.bindW(
			'entitiesWithInvalid',
			({ result }) =>
				pipe(
					result.items,
					toProductEntitiesWithInvalid,
					RTE.right,
				),
		),
		RTE.tapReaderIO(
			flow(
				result => result.entitiesWithInvalid,
				SEP.left,
				RoA.map(id =>
					logInfo(`Corrupt entity with id ${id}`),
				),
				RIO.sequenceArray,
			),
		),
		RTE.bindW(
			'entities',
			({ entitiesWithInvalid }) =>
				pipe(
					entitiesWithInvalid,
					discardInvalid,
					RTE.right,
				),
		),
		RTE.bindW('models', ({ entities }) =>
			pipe(
				entities,
				toProductModels,
				RTE.fromTask,
			),
		),
		RTE.bimap(
			error => error.message,
			({ result: { total }, models }) => ({
				total,
				models,
			}),
		),
	),
)
