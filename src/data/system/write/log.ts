import { function as F } from 'fp-ts'

import type { Log } from '@/app/interfaces/write/log'

export function tidy(object: unknown): string {
	return JSON.stringify(object, null, 3)
}

interface Deps {
	readonly prefix: string
}

export const log: (d: Deps) => Log = F.flip(
	({ severity: type, message }) =>
		({ prefix }) =>
		() => {
			switch (type) {
				case 'info': {
					console.info(
						`[%c${prefix}%c]`,
						'font-weight: bold',
						'font-weight: normal',
						message,
					)
					return
				}
				case 'error': {
					console.error(
						`[%c${prefix}%c]`,
						'font-weight: bold',
						'font-weight: normal',
						message,
					)
					return
				}
				case 'warning': {
					console.warn(
						`[%c${prefix}%c]`,
						'font-weight: bold',
						'font-weight: normal',
						message,
					)
					return
				}
				case 'debug': {
					console.debug(
						`[%c${prefix}%c]`,
						'font-weight: bold',
						'font-weight: normal',
						message,
					)
					return
				}
			}
		},
)