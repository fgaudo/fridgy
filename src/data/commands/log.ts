import { reader as R, task as T } from 'fp-ts'

import { R_Log } from '@/app'

export const log: R_Log<unknown> = () =>
	R.of(T.of(undefined))
