import * as R from 'fp-ts/Reader'
import * as T from 'fp-ts/Task'

import { LogWithDeps } from '@/application/commands/log'

export const log: LogWithDeps<unknown> = () => R.of(T.of(undefined))
