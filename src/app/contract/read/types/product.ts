import { contramap } from 'fp-ts/lib/Eq'

import * as I from '@/core/id'

import type { ProductInputDTO } from '@/app/contract/write/add-product'

export type ProductDTO = {
	id: I.Id
} & ProductInputDTO

export const ProductDTO = {
	Eq: contramap(({ id }: ProductDTO) => id)(I.Eq),
}
