export type LogDTO = Readonly<{
	type: 'debug' | 'info' | 'warn' | 'error'
	message: readonly unknown[]
}>
