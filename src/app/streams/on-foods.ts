import * as R from 'fp-ts/Reader'
import { Observable } from 'rxjs'

import type { FoodDTO } from '@/app/types/food'

export type OnFoods<ID> = Observable<
	ReadonlySet<FoodDTO<ID>>
>

export type R_OnFoods<ENV, ID> = R.Reader<
	ENV,
	Observable<ReadonlySet<FoodDTO<ID>>>
>
