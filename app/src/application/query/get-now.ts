import { TaskEither } from 'fp-ts/lib/TaskEither'

export type GetNow = TaskEither<string, number>
