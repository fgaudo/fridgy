import * as O from 'fp-ts-rxjs/Observable'
import * as D from 'fp-ts/lib/Date'
import * as IO from 'fp-ts/lib/IO'
import * as R from 'fp-ts/lib/Random'
import { match } from 'fp-ts/lib/ReadonlyArray'
import { pipe } from 'fp-ts/lib/function'
import { Observable } from 'rxjs'

import { Single, fromObservable } from './rxjs'

type LoggingLevel = 'debug' | 'error' | 'info' | 'warn'
export type LogEntry = Readonly<{
	_tag: 'CORE.Logging'
	timestamp: string
	level: LoggingLevel
	message: string
}>

export const info: (
	message: string,
	flows: readonly string[]
) => Single<LogEntry> = (message, flows = []) =>
	fromObservable(
		pipe(
			createLog(message, flows),
			O.map(log => ({ ...log, level: 'info' }))
		)
	)

export const error: (
	message: string,
	flows: readonly string[]
) => Single<LogEntry> = (message, flows = ['']) =>
	fromObservable(
		pipe(
			createLog(message, flows),
			O.map(log => ({ ...log, level: 'error' }))
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
		_tag: 'CORE.Logging'
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
						_tag: 'CORE.Logging',
						message: messageResult,
						timestamp: date
					} as const)
			)
		)
	)
