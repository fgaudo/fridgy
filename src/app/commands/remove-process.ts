import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessDTO } from '@/app/types/process'

export type RemoveProcess = (
	id: ProcessDTO['id'],
) => TE.TaskEither<Error, void>

export type R_RemoveProcess<ENV> = (
	id: ProcessDTO['id'],
) => RTE.ReaderTaskEither<ENV, Error, void>
