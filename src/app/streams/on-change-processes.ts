import { ReaderObservable } from 'fp-ts-rxjs/lib/ReaderObservable'
import { Observable } from 'rxjs'

import { Processes } from '@/app/types/process'

export type OnChangeProcessesWithDeps<ENV> =
	ReaderObservable<ENV, Processes>
export type OnChangeProcesses =
	Observable<Processes>
