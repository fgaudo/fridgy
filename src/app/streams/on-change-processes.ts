import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { ProcessDTO } from '@/app/types/process'

export type OnChangeProcesses = Observable<
	ReadonlySet<ProcessDTO>
>

export type R_OnChangeProcesses<ENV> = R.Reader<
	ENV,
	Observable<ReadonlySet<ProcessDTO>>
>
