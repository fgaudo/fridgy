import type { ReaderObservable } from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import type { Observable } from 'rxjs'

export interface Failure {
	name: string
	message: string
}
export type AddFailure = (
	failure: Failure,
) => Observable<void>

export type R_AddFailure<ENV> = (
	failure: Failure,
) => ReaderObservable<ENV, void>
