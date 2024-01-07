import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'

import { Process } from '@/app/types/process'

export type EnqueueProcessWithDeps<ENV> = (
	process: Omit<Process, 'id' | 'timestamp'>,
) => ReaderTaskEither<ENV, Error, void>
