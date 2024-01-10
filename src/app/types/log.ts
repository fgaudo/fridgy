export type LogDTO = Readonly<{
	type: 'debug' | 'info' | 'warn' | 'error'
	message: string
}>

export const info: (s: string) => LogDTO = (
	message: string,
) => ({
	type: 'info',
	message,
})

export const warn: (s: string) => LogDTO = (
	message: string,
) => ({
	type: 'warn',
	message,
})

export const error: (s: string) => LogDTO = (
	message: string,
) => ({
	type: 'error',
	message,
})

export const debug: (s: string) => LogDTO = (
	message: string,
) => ({
	type: 'debug',
	message,
})
