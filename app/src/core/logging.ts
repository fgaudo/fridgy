import * as O from 'fp-ts-rxjs/Observable'
import * as D from 'fp-ts/lib/Date'
import * as E from 'fp-ts/lib/Either'
import * as IO from 'fp-ts/lib/IO'
import * as R from 'fp-ts/lib/Random'
import { match } from 'fp-ts/lib/ReadonlyArray'
import { pipe } from 'fp-ts/lib/function'

import { Single, fromObservable } from './single'

export type WithLogging<A> = E.Either<LogEntry, A>

type LoggingLevel = 'debug' | 'error' | 'info' | 'warn'
export type LogEntry = Readonly<{
	timestamp: string
	level: LoggingLevel
	message: string
}>

export const info: <A>(
	message: string,
	flows?: readonly string[]
) => Single<WithLogging<A>> = (message, flows = []) =>
	fromObservable(
		pipe(
			createLog(message, flows),
			O.map(log => E.left({ ...log, level: 'info' }))
		)
	)

export const error: <A>(
	message: string,
	flows?: readonly string[]
) => Single<WithLogging<A>> = (message, flows = [''] as const) =>
	fromObservable(
		pipe(
			createLog(message, flows),
			O.map(log => E.left({ ...log, level: 'error' }))
		)
	)

/** This generates a random string in order to track a specific flow of requests in the log entries. */
export const createFlow: Single<string> = fromObservable(
	pipe(O.fromIO(R.randomInt(0, 5000)), O.map(toString))
)

const createLog: (
	message: string,
	flows: readonly string[]
) => Single<
	Readonly<{
		timestamp: string
		message: string
	}>
> = (message, flows = []) =>
	fromObservable(
		pipe(
			D.create,
			IO.map(date => date.toISOString()),
			O.fromIO,
			O.bindTo('date'),
			O.bind('messageResult', () =>
				pipe(
					flows,
					match(
						() => message,
						f => `[${f.join('_')}] ${message}`
					),
					O.of
				)
			),
			O.map(
				({ date, messageResult }) =>
					({
						message: messageResult,
						timestamp: date
					} as const)
			)
		)
	)
