import { ReaderTask } from 'fp-ts/lib/ReaderTask'

import { Failure } from '@/app/types/failure'

export type AddFailureWithDeps<ENV> = (
	failure: Failure,
) => ReaderTask<ENV, void>
