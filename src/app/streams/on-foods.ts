import { Reader } from 'fp-ts/lib/Reader'
import { Observable } from 'rxjs'

import { FoodData } from '@/app/types/food'

export type OnFoodsWithDeps<ENV> = Reader<
	ENV,
	Observable<ReadonlySet<FoodData>>
>
