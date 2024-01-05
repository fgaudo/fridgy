export type Log = Readonly<{
	type: 'debug' | 'info' | 'warn' | 'error'
	message: string
}>

export const info: (s: string) => Log = (
	message: string,
) => ({
	type: 'info',
	message,
})

export const warn: (s: string) => Log = (
	message: string,
) => ({
	type: 'warn',
	message,
})

export const error: (s: string) => Log = (
	message: string,
) => ({
	type: 'error',
	message,
})

export const debug: (s: string) => Log = (
	message: string,
) => ({
	type: 'debug',
	message,
})
