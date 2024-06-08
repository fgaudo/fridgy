import {
	eq as Eq,
	function as F,
	reader as R,
} from 'fp-ts'
import { Observable } from 'rxjs'

import { Base64 } from '@/core/base64'

import type { ProductDTO } from '@/app/contract/read/types/product'

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
	}): ProductEntityDTO => ({
		id,
		product,
	}),
} as const

export type OnProducts = Observable<
	ReadonlySet<ProductEntityDTO>
>

export type R_OnProducts<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<ProductEntityDTO>>
>
