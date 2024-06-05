import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import type { Base64 } from '@/core/base64'

import type { ProductDTO } from '@/app/contract/read/types/product'

export type ProductEntityDTO = Readonly<{
	id: Base64
	product: ProductDTO
}>

export type OnProducts = Observable<
	ReadonlySet<ProductEntityDTO>
>

export type R_OnProducts<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<ProductEntityDTO>>
>
