import { io as IO, readerIO as RIO } from 'fp-ts'

export type LogType =
	| 'debug'
	| 'info'
	| 'warning'
	| 'error'

export type Log = (data: {
	type: LogType
	message: string
}) => IO.IO<void>

export type R_Log<ENV> = (data: {
	type: LogType
	message: string
}) => RIO.ReaderIO<ENV, void>
