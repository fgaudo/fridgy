import { reader as R, task as T } from 'fp-ts'

import { Log } from '@/app'

export const log: Log<unknown> = () =>
	R.of(T.of(undefined))
