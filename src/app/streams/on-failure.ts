import { ReaderObservable } from 'fp-ts-rxjs/lib/ReaderObservable'
import { Observable } from 'rxjs'

import { Failure } from '@/app/types/failure'

export type OnFailure = Observable<Failure>
export type OnFailureWithDeps<ENV> =
	ReaderObservable<ENV, Failure>
