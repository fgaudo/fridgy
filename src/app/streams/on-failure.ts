import { Reader } from 'fp-ts/lib/Reader'
import { Observable } from 'rxjs'

import { Failure } from '@/app/types/failure'

export type OnFailureWithDeps<ENV> = Reader<
	ENV,
	Observable<Failure>
>
