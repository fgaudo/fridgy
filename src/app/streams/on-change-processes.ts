import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { ProcessDTO } from '@/app/types/process'

export type OnChangeProcesses<ID> = Observable<
	ReadonlySet<ProcessDTO<ID>>
>

export type R_OnChangeProcesses<ENV, ID> =
	R.Reader<
		ENV,
		Observable<ReadonlySet<ProcessDTO<ID>>>
	>
