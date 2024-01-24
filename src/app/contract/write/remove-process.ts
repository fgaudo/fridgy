import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

export type RemoveProcess<ID> = (
	id: ID,
) => TE.TaskEither<Error, void>

export type R_RemoveProcess<ENV, ID> = (
	id: ID,
) => RTE.ReaderTaskEither<ENV, Error, void>
