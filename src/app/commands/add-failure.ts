import { ReaderTask } from 'fp-ts/lib/ReaderTask'
import { Task } from 'fp-ts/lib/Task'

import { Failure } from '@/app/types/failure'

export type AddFailure = (
	failure: Failure,
) => Task<void>

export type AddFailureWithDeps<ENV> = (
	failure: Failure,
) => ReaderTask<ENV, void>
