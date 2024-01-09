import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { Failure } from '@/app/types/failure'
import { FoodData } from '@/app/types/food'
import { Process } from '@/app/types/process'

// =============

export type OnChangeProcesses = Observable<
	ReadonlySet<Process>
>

export type R_OnChangeProcesses<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<Process>>
>

// =============

export type OnFailure = Observable<Failure>

export type R_OnFailure<ENV> = R.Reader<
	ENV,
	Observable<Failure>
>

// ============

export type OnFoods = Observable<
	ReadonlySet<FoodData>
>

export type R_OnFoods<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<FoodData>>
>
