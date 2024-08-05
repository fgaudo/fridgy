import {
	either as E,
	eq as Eq,
	function as F,
	option as OPT,
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
	expiration,
	isExpired,
	name,
} from '@/domain/product'

import {
	ProductDTO,
	type Products,
} from '@/app/interfaces/read/products'
import type { Log } from '@/app/interfaces/write/log'

const pipe = F.pipe
const flow = F.flow

export interface ProductModel {
	id: string
	name: string
	expirationDate: OPT.Option<number>
	isExpired: boolean
}

const ProductModel = {
	Eq: Eq.contramap((a: ProductModel) => a.id)(
		S.Eq,
	),
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
	foodDTOs: readonly ProductDTO[],
) => SEP.Separated<
	readonly string[],
	readonly ProductEntity[]
> = RoA.partitionMap(entityDTO =>
	pipe(
		createProduct({
			name: entityDTO.name,
			expiration: entityDTO.expirationDate,
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
		T.fromIO(() => Date.now()),
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
					expirationDate: expiration(product),
				})),
			),
		),
	)

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

export type ProductList = TE.TaskEither<
	string,
	{
		total: number
		models: readonly ProductModel[]
	}
>

export const useCase: (
	deps: UseCases,
) => ProductList = pipe(
	RTE.Do,
	RTE.bind('result', () =>
		R.asks(
			(useCases: UseCases) => useCases.products,
		),
	),
	RTE.tapReaderIO(({ result }) =>
		logInfo(
			`Received ${result.items.length.toString(10)} product entries out of ${result.total.toString(10)}`,
		),
	),
	RTE.bindW('entitiesWithInvalid', ({ result }) =>
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
		pipe(entities, toProductModels, RTE.fromTask),
	),
	RTE.bimap(
		error => error.message,
		({ result: { total }, models }) => ({
			total,
			models,
		}),
	),
)
