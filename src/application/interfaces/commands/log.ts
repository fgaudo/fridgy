import { Exception } from '@/core/exception'
import { TaskOption } from 'fp-ts/lib/TaskOption'

export type Log = (message: string, timestamp: number) => TaskOption<Exception>
