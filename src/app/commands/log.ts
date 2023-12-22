import { readerTask as RT, task as T } from 'fp-ts'

export enum LogType {
	info,
	debug,
	error
}

export type Log = (type: LogType, message: string) => T.Task<void>

export type LogWithDeps<ENV> = (
	type: LogType,
	message: string
) => RT.ReaderTask<ENV, void>
