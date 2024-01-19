import * as R from 'fp-ts/Reader'
import { Observable } from 'rxjs'

export interface Failure {
	name: string
	message: string
}
export type OnFailure = Observable<Failure>

export type R_OnFailure<ENV> = R.Reader<
	ENV,
	Observable<Failure>
>
