import { io as IO } from 'fp-ts'

export type LogSeverity =
	| 'debug'
	| 'info'
	| 'warning'
	| 'error'

export type Log = (data: {
	severity: LogSeverity
	message: string
}) => IO.IO<void>
