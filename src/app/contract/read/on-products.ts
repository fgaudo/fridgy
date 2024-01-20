import * as R from 'fp-ts/Reader'
import { Observable } from 'rxjs'

import type { ProductDTO } from '@/app/contract/read/types/product'

export type OnProducts<ID> = Observable<
	ReadonlySet<ProductDTO<ID>>
>

export type R_OnProducts<ENV, ID> = R.Reader<
	ENV,
	Observable<ReadonlySet<ProductDTO<ID>>>
>
