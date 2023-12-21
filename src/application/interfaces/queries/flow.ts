import { TaskEither } from 'fp-ts/lib/TaskEither'

import { Exception } from '@/core/exception'

export type OnceFlow = TaskEither<Exception, string>
