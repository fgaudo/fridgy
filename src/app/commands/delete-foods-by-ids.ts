import { readerTaskEither as RE, taskEither as TE } from 'fp-ts'

export type DeleteFoodsByIds = (
	ids: ReadonlySet<string>
) => TE.TaskEither<Error, void>

export type DeleteFoodsByIdsWithDeps<ENV> = (
	ids: ReadonlySet<string>
) => RE.ReaderTaskEither<ENV, Error, void>
