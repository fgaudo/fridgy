import { TaskOption } from 'fp-ts/lib/TaskOption'

import { Exception } from '@/core/exception'

export type Log = (message: string, timestamp: number) => TaskOption<Exception>
