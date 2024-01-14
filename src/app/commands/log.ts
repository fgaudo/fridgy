import * as IO from 'fp-ts/IO'
import * as RIO from 'fp-ts/ReaderIO'

export type LogType =
	| 'debug'
	| 'info'
	| 'warning'
	| 'error'

export type Log = (
	type: LogType,
	message: string,
) => IO.IO<void>

export type R_Log<ENV> = (
	type: LogType,
	message: string,
) => RIO.ReaderIO<ENV, void>
