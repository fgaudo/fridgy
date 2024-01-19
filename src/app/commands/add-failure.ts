import * as RT from 'fp-ts/ReaderTask'
import * as T from 'fp-ts/Task'

import type { Failure } from '@/app/types/failure'

export type AddFailure = (
	failure: Failure,
) => T.Task<void>

export type R_AddFailure<ENV> = (
	failure: Failure,
) => RT.ReaderTask<ENV, void>
