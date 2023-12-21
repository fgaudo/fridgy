import { Exception } from '@/core/exception'
import { TaskEither } from 'fp-ts/lib/TaskEither'

export type Now = TaskEither<Exception, number>
