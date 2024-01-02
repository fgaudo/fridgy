import { ReaderObservable } from 'fp-ts-rxjs/lib/ReaderObservable'
import { ReaderTask } from 'fp-ts/lib/ReaderTask'
import { Task } from 'fp-ts/lib/Task'
import { Observable } from 'rxjs'

export interface Failure {
	readonly name: string
	readonly message: string
}

export type OnFailure = Observable<Failure>
export type OnFailureWithDeps<ENV> = ReaderObservable<ENV, Failure>

export type AddFailure = (failure: Failure) => Task<void>
export type AddFailureWithDeps<ENV> = (
	failure: Failure
) => ReaderTask<ENV, void>
