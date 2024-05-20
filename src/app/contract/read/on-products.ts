import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import type { ProductDTO } from '@/app/contract/read/types/product'

export type OnProducts = Observable<
	ReadonlySet<ProductDTO>
>

export type R_OnProducts<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<ProductDTO>>
>
