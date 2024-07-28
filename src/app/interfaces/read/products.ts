import {
	eq as Eq,
	function as F,
	string as S,
	taskEither as TE,
} from 'fp-ts'

import type { ProductDTO } from '@/app/interfaces/read/types/product'

const pipe = F.pipe

export type ProductEntityDTO = Readonly<{
	id: string
	product: ProductDTO
}>

export const ProductEntityDTO = {
	Eq: pipe(
		S.Eq,
		Eq.contramap(
			(product: ProductEntityDTO) => product.id,
		),
	),
	create: ({
		id,
		product,
	}: {
		id: string
		product: ProductDTO
	}) => ({ id, product }),
} as const

export interface Options {
	sortBy: 'date' | 'a-z'
	offset: number
}

export type Products = (
	options: Options,
) => TE.TaskEither<
	Error,
	{
		items: readonly ProductEntityDTO[]
		total: number
	}
>
