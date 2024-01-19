import * as R from 'fp-ts/Reader'
import { Observable } from 'rxjs'

import type { ProcessDTO } from '@/app/types/process'

export type OnChangeProcesses<ID> = Observable<
	ReadonlySet<ProcessDTO<ID>>
>

export type R_OnChangeProcesses<ENV, ID> =
	R.Reader<
		ENV,
		Observable<ReadonlySet<ProcessDTO<ID>>>
	>
