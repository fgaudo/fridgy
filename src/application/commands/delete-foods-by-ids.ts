import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import { TaskEither } from 'fp-ts/TaskEither'

export type DeleteFoodsByIds = (
	ids: ReadonlySet<string>
) => TaskEither<Error, void>

export type DeleteFoodsByIdsWithDeps<ENV> = (
	ids: ReadonlySet<string>
) => ReaderTaskEither<ENV, Error, void>
