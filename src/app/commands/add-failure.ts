import {
	readerTask as RT,
	task as T,
} from 'fp-ts'

import { Failure } from '@/app/types/failure'

export type AddFailure = (
	failure: Failure,
) => T.Task<void>

export type R_AddFailure<ENV> = (
	failure: Failure,
) => RT.ReaderTask<ENV, void>
