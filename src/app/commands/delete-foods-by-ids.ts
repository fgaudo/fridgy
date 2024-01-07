import { readerTaskEither as RE } from 'fp-ts'

export type DeleteFoodsByIdsWithDeps<ENV> = (
	ids: ReadonlySet<string> | string,
) => RE.ReaderTaskEither<ENV, Error, void>
