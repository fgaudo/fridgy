import { reader as R, task as T } from 'fp-ts'

import { LogWithDeps } from '@/app/commands/log'

export const log: LogWithDeps<unknown> = () => R.of(T.of(undefined))
