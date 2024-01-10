import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { Failure } from '@/app/types/failure'
import { FoodDTO } from '@/app/types/food'
import { ProcessDTO } from '@/app/types/process'

// =============

export type OnChangeProcesses = Observable<
	ReadonlySet<ProcessDTO>
>

export type R_OnChangeProcesses<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<ProcessDTO>>
>

// =============

export type OnFailure = Observable<Failure>

export type R_OnFailure<ENV> = R.Reader<
	ENV,
	Observable<Failure>
>

// ============

export type OnFoods = Observable<
	ReadonlySet<FoodDTO>
>

export type R_OnFoods<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<FoodDTO>>
>
