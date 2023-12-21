import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as OO from 'fp-ts-rxjs/lib/ObservableOption'
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import * as Opt from 'fp-ts/lib/Option'
import { tapIO } from 'fp-ts/lib/Task'
import { pipe } from 'fp-ts/lib/function'

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
) => (deps: Interface['onceNow'] & Interface['log']) => void

export const log: Log =
	message =>
	({ onceNow, log: log_ }) =>
		pipe(
			onceNow,
			OE.fromTaskEither,
			OE.fold(
				entry => O.fromTask(log_(message + entry.message, 0)),
				now => O.fromTask(log_(message, now))
			),
			OO.fold(
				() => O.of(undefined),
				() => O.of(undefined)
			)
		)
