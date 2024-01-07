import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'

import { Process } from '@/app/types/process'

export type RemoveProcessWithDeps<ENV> = (
	id: Process['id'],
) => ReaderTaskEither<ENV, Error, void>
