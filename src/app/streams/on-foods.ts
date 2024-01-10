import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { FoodDTO } from '@/app/types/food'

export type OnFoods = Observable<
	ReadonlySet<FoodDTO>
>

export type R_OnFoods<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<FoodDTO>>
>
