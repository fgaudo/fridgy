import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { FoodDTO } from '@/app/types/food'

export type OnFoods<ID> = Observable<
	ReadonlySet<FoodDTO<ID>>
>

export type R_OnFoods<ENV, ID> = R.Reader<
	ENV,
	Observable<ReadonlySet<FoodDTO<ID>>>
>
