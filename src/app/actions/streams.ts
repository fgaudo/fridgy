import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { Failure } from '@/app/types/failure'
import { FoodData } from '@/app/types/food'
import { Processes } from '@/app/types/process'

export type OnChangeProcesses<ENV> = R.Reader<
	ENV,
	Observable<Processes>
>

export type OnFailure<ENV> = R.Reader<
	ENV,
	Observable<Failure>
>

export type OnFoods<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<FoodData>>
>
