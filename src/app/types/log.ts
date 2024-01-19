export interface LogDTO {
	type: 'debug' | 'info' | 'warn' | 'error'
	message: readonly unknown[]
}
