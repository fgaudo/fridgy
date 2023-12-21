import { TaskEither } from 'fp-ts/lib/TaskEither'

import { Exception } from '@/core/exception'

export type Now = TaskEither<Exception, number>
