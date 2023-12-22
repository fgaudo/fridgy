import { ReaderTask } from 'fp-ts/ReaderTask'
import { Task } from 'fp-ts/Task'

export enum LogType {
	info,
	debug,
	error
}

export type Log = (type: LogType, message: string) => Task<void>

export type LogWithDeps<ENV> = (
	type: LogType,
	message: string
) => ReaderTask<ENV, void>
