import { io as IO } from 'fp-ts'

export type LogType =
	| 'debug'
	| 'info'
	| 'warning'
	| 'error'

export type Log = (data: {
	type: LogType
	message: string
}) => IO.IO<void>
