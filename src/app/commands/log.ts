import { io as I, readerIO as RIO } from 'fp-ts'

export enum LogType {
	info,
	debug,
	error
}

export type Log = (type: LogType, message: string) => I.IO<void>

export type LogWithDeps<ENV> = (
	type: LogType,
	message: string
) => RIO.ReaderIO<ENV, void>
