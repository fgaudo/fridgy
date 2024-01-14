import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

export type RemoveProcess<ID> = (
	id: ID,
) => TE.TaskEither<Error, void>

export type R_RemoveProcess<ENV, ID> = (
	id: ID,
) => RTE.ReaderTaskEither<ENV, Error, void>
