import { pipe } from 'effect/Function'

import { A, E, Eff, type O } from '@/core/imports'

import {
	type Product,
	createProduct,
} from '@/domain/product'

import {
	type ProductDTO,
	ProductsService,
} from '../interfaces/read/products'

export interface ProductModel {
	id: string
	name: string
	expirationDate: O.Option<number>
	creationDate: number
}

interface ProductEntity {
	id: string
	creationDate: number
	product: Product
}

const toProductEntitiesWithInvalid: (
	foodDTOs: readonly ProductDTO[],
) => readonly [
	readonly ProductDTO[],
	readonly ProductEntity[],
] = A.partitionMap(entityDTO =>
	pipe(
		createProduct(entityDTO),
		E.mapBoth({
			onLeft: () => entityDTO,
			onRight: product =>
				({
					id: entityDTO.id,
					product,
					creationDate: entityDTO.creationDate,
				}) as const,
		}),
	),
)

const toProductModels: (
	products: readonly ProductEntity[],
) => readonly ProductModel[] = A.map(
	({ id, product, creationDate }) => ({
		name: product.name,
		expirationDate: product.expiration,
		id,
		creationDate,
	}),
)

export type ProductList = Eff.Effect<
	{
		total: number
		models: readonly ProductModel[]
	},
	string,
	ProductsService
>

export const useCase: ProductList = Eff.gen(
	function* () {
		const getProductListWithTotal =
			yield* ProductsService

		const { total, products } =
			yield* getProductListWithTotal

		yield* Eff.log(
			`Received ${products.length.toString(10)} products out of ${total.toString(10)}`,
		)

		const [invalids, productEntities] =
			toProductEntitiesWithInvalid(products)

		if (invalids.length > 0) {
			yield* Eff.logWarning(
				'Invalid data found',
			).pipe(Eff.annotateLogs('data', invalids))
		}

		const models = toProductModels(
			productEntities,
		)

		return { models, total }
	},
)
