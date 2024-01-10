import { reader as R, task as T } from 'fp-ts'

import { R_Log } from '@/app/commands/log'

export const log: R_Log<unknown> = log =>
	R.of(
		T.fromIO(() => {
			switch (log.type) {
				case 'info': {
					console.info(log.message)
					return
				}
				case 'error': {
					console.error(log.message)
					return
				}
				case 'warn': {
					console.warn(log.message)
					return
				}
				case 'debug': {
					console.debug(log.message)
					return
				}
			}
		}),
	)
