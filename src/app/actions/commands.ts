import {
	readerIO as RIO,
	readerTask as RT,
	readerTaskEither as RTE,
} from 'fp-ts'

import { Failure } from '@/app/types/failure'
import * as L from '@/app/types/log'
import { Process } from '@/app/types/process'

export type AddFailure<ENV> = (
	failure: Failure,
) => RT.ReaderTask<ENV, void>

export type DeleteFoodsByIds<ENV> = (
	ids: ReadonlySet<string> | string,
) => RTE.ReaderTaskEither<ENV, Error, void>

export type EnqueueProcess<ENV> = (
	process: Omit<Process, 'id' | 'timestamp'>,
) => RTE.ReaderTaskEither<ENV, Error, void>

export type Log<ENV> = (
	log: L.Log,
) => RIO.ReaderIO<ENV, void>

export type RemoveProcess<ENV> = (
	id: Process['id'],
) => RTE.ReaderTaskEither<ENV, Error, void>
