import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'

import { Process } from '@/app/types/process'

export type GetProcessesWithDeps<ENV> =
	ReaderTaskEither<
		ENV,
		Error,
		ReadonlySet<Process>
	>
