import type { ProductInputDTO } from '@/app/contract/write/add-product'

export type ProductDTO<ID> = {
	id: ID
} & ProductInputDTO

export const productDataEquals: <ID>(
	a: ProductDTO<ID>,
	b: ProductDTO<ID>,
) => boolean = (a, b) => a.id === b.id
