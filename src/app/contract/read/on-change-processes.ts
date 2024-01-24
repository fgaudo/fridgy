import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import type { ProcessDTO } from '@/app/contract/read/types/process'

export type OnChangeProcesses<ID> = Observable<
	ReadonlySet<ProcessDTO<ID>>
>

export type R_OnChangeProcesses<ENV, ID> =
	R.Reader<
		ENV,
		Observable<ReadonlySet<ProcessDTO<ID>>>
	>
