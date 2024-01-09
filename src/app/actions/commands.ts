import {
	io as IO,
	readerIO as RIO,
	readerTask as RT,
	readerTaskEither as RTE,
	task as T,
	taskEither as TE,
} from 'fp-ts'

import { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

import { Failure } from '@/app/types/failure'
import * as L from '@/app/types/log'
import { Process } from '@/app/types/process'

// ===============

export type AddFailure = (
	failure: Failure,
) => T.Task<void>

export type R_AddFailure<ENV> = (
	failure: Failure,
) => RT.ReaderTask<ENV, void>

// ===============

export type DeleteFoodsByIds = (
	ids: ReadonlyNonEmptySet<string>,
) => TE.TaskEither<Error, void>

export type R_DeleteFoodsByIds<ENV> = (
	ids: ReadonlyNonEmptySet<string>,
) => RTE.ReaderTaskEither<ENV, Error, void>

// ===============

export type EnqueueProcess = (
	process: Omit<Process, 'id' | 'timestamp'>,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV> = (
	process: Omit<Process, 'id' | 'timestamp'>,
) => RTE.ReaderTaskEither<ENV, Error, void>

// ===============

export type Log = (log: L.Log) => IO.IO<void>

export type R_Log<ENV> = (
	log: L.Log,
) => RIO.ReaderIO<ENV, void>

// ===============

export type RemoveProcess = (
	id: Process['id'],
) => TE.TaskEither<Error, void>

export type R_RemoveProcess<ENV> = (
	id: Process['id'],
) => RTE.ReaderTaskEither<ENV, Error, void>
