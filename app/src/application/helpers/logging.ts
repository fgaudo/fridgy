import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { Interface } from '../interfaces'

export type LoggingLevel = 'error' | 'debug' | 'info' | 'warning'

export type LogEntry = Readonly<{
	timestamp: Opt.Option<number>
	level: LoggingLevel
	message: string
	flows: Opt.Option<Readonly<NonEmptyArray<string>>>
}>

export type Log = (
	message: string,
	flows?: Readonly<NonEmptyArray<string>>
) => (deps: Interface['onceNow'] & Interface['log']) => Rx.Observable<never>

export const log: Log =
	message =>
	({ onceNow, log }) =>
		pipe(
			onceNow,
			OE.fold(
				entry => log(message + entry.message, 0),
				now => log(message, now)
			),
			O.map(flow(Opt.fold(() => undefined, console.error))),
			Rx.ignoreElements()
		)
