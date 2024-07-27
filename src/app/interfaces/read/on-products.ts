import { eq as Eq, function as F } from 'fp-ts'
import { Observable } from 'rxjs'

import { Base64 } from '@/core/base64'

import type { ProductDTO } from '@/app/interfaces/read/types/product'

const pipe = F.pipe

export type ProductEntityDTO = Readonly<{
	id: Base64
	product: ProductDTO
}>

export const ProductEntityDTO = {
	Eq: pipe(
		Base64.Eq,
		Eq.contramap(
			(product: ProductEntityDTO) => product.id,
		),
	),
	create: ({
		id,
		product,
	}: {
		id: Base64
		product: ProductDTO
	}) => ({ id, product }),
} as const

export interface Options {
	sortBy: 'date' | 'a-z'
	offset: number
}

export type OnProducts = (
	options: Options,
) => Observable<{
	items: readonly ProductEntityDTO[]
	offset: number
	total: number
}>
