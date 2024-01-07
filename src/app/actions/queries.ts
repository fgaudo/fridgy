import { readerTaskEither as RTE } from 'fp-ts'

import { Process } from '@/app/types/process'

export type GetProcesses<ENV> =
	RTE.ReaderTaskEither<
		ENV,
		Error,
		ReadonlySet<Process>
	>
