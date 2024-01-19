import * as RT from 'fp-ts/ReaderTask'
import * as T from 'fp-ts/Task'

export interface Failure {
	name: string
	message: string
}
export type AddFailure = (
	failure: Failure,
) => T.Task<void>

export type R_AddFailure<ENV> = (
	failure: Failure,
) => RT.ReaderTask<ENV, void>
