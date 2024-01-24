import { reader as R } from 'fp-ts'
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
