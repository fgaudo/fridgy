import { Reader } from 'fp-ts/lib/Reader'
import { Observable } from 'rxjs'

import { Processes } from '@/app/types/process'

export type OnChangeProcessesWithDeps<ENV> =
	Reader<ENV, Observable<Processes>>
