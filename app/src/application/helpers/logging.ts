import {
	readerObservableEither as ROEx,
	readerObservable as ROx
} from '@fgaudo/fp-ts-rxjs-extension'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as ROE from 'fp-ts-rxjs/lib/ReaderObservableEither'
import { ReaderObservableEither } from 'fp-ts-rxjs/lib/ReaderObservableEither'
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'
import * as ST from 'simplytyped'

import { Interface } from '../interfaces'
import { OnceNow } from '../interfaces/queries/now'

export type LoggingLevel = 'error' | 'debug' | 'info' | 'warning'

export type LogEntry = Readonly<{
	timestamp: Opt.Option<number>
	level: LoggingLevel
	message: string
	flows: Opt.Option<Readonly<NonEmptyArray<string>>>
}>

type LogShared = (
	flows: Opt.Option<Readonly<NonEmptyArray<string>>>
) => ReaderObservableEither<Interface['onceNow'], LogEntry, number>
const onceNowData: LogShared =
	flows =>
	({ onceNow }) =>
		pipe(
			onceNow,
			OE.fold(
				err =>
					OE.left({
						timestamp: Opt.none,
						level: 'error',
						message: `Could not get timestamp ${err.message}`,
						flows
					} satisfies LogEntry),
				OE.right
			)
		)

type LogError = (
	message: string,
	flows?: Readonly<NonEmptyArray<string>>
) => RO.ReaderObservable<Interface['onceNow'], LogEntry>

export const logError: LogError = (message, flows) =>
	pipe(
		Opt.fromNullable(flows),
		onceNowData,
		ROEx.fold(
			entry =>
				ROx.concat(
					RO.of(entry),
					RO.of({
						level: 'error',
						message,
						flows: Opt.fromNullable(flows),
						timestamp: Opt.none
					} satisfies LogEntry)
				),
			now =>
				RO.of({
					level: 'error',
					message,
					flows: Opt.fromNullable(flows),
					timestamp: Opt.some(now)
				} satisfies LogEntry)
		)
	)

export type LogInfo_ = (
	message: string,
	flows?: Readonly<NonEmptyArray<string>>
) => RO.ReaderObservable<Interface['onceNow'], LogEntry>

const logInfo_: LogInfo_ = (message, flows) =>
	pipe(
		Opt.fromNullable(flows),
		onceNowData,
		ROEx.fold(
			entry =>
				ROx.concat(
					RO.of(entry),
					RO.of({
						level: 'info',
						message,
						flows: Opt.fromNullable(flows),
						timestamp: Opt.none
					} satisfies LogEntry)
				),
			now =>
				RO.of({
					level: 'info',
					message,
					flows: Opt.fromNullable(flows),
					timestamp: Opt.some(now)
				} satisfies LogEntry)
		)
	)

type LogInfo = (
	message: string,
	flows?: Readonly<NonEmptyArray<string>>
) => ROE.ReaderObservableEither<Interface['onceNow'], LogEntry, never>

export const logInfo: LogInfo = (message, flows) => env =>
	pipe(logInfo_(message, flows)(env), OE.leftObservable)
