import { Single } from '@/core/single'
import { Either } from 'fp-ts/lib/Either'

export type WithLogging<A> = Either<LogEntry, A>

type LoggingLevel = 'debug' | 'error' | 'info' | 'warn'
export type LogEntry = Readonly<{
	timestamp: string
	level: LoggingLevel
	message: string
}>

export type OnceError<A> = (
	message: string,
	flows?: readonly string[]
) => Single<Either<LogEntry, A>>

export type OnceInfo<A> = (
	message: string,
	flows?: readonly string[]
) => Single<Either<LogEntry, A>>
