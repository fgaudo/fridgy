import { Exception } from '@/core/exception'
import { Single } from '@/core/single'
import { Either } from 'fp-ts/lib/Either'

export type WithLogging<A> = Either<LogEntry, A>

type LoggingLevel = 'debug' | 'error' | 'info' | 'warn'
export type LogEntry = Readonly<{
	timestamp: number
	level: LoggingLevel
	message: string
}>

export type OnceError = (
	message: string,
	flows?: readonly string[]
) => Single<
	Either<
		Exception,
		{
			timestamp: number
			level: 'error'
			message: string
		}
	>
>

export type OnceInfo = (
	message: string,
	flows?: readonly string[]
) => Single<
	Either<
		Exception,
		{
			timestamp: number
			level: 'info'
			message: string
		}
	>
>
