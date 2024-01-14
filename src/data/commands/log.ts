import { R_Log } from '@/app/commands/log'

export function tidy(object: unknown): string {
	return JSON.stringify(object, null, 3)
}

interface Deps {
	readonly prefix: string
}

export const log: R_Log<Deps> =
	(type, message) =>
	({ prefix }) =>
	() => {
		switch (type) {
			case 'info': {
				console.info(
					`[%c${prefix}]`,
					'font-weight: bold',
					message,
				)
				return
			}
			case 'error': {
				console.error(
					`[%c${prefix}]`,
					'font-weight: bold',
					message,
				)
				return
			}
			case 'warning': {
				console.warn(
					`[%c${prefix}]`,
					'font-weight: bold',
					message,
				)
				return
			}
			case 'debug': {
				console.debug(
					`[%c${prefix}]`,
					'font-weight: bold',
					message,
				)

				return
			}
		}
	}
