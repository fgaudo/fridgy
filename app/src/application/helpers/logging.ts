import * as ROx from '@/core/readerObservable'
import * as ROEx from '@/core/readerObservableEither'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as ROE from 'fp-ts-rxjs/lib/ReaderObservableEither'
import { ReaderObservableEither } from 'fp-ts-rxjs/lib/ReaderObservableEither'
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'

import { OnceNow } from '../queries/now'

export type LoggingLevel = 'error' | 'debug' | 'info' | 'warning'

export type LogEntry = Readonly<{
	timestamp: Opt.Option<number>
	level: LoggingLevel
	message: string
	flows: Opt.Option<Readonly<NonEmptyArray<string>>>
}>

type LogShared = (
	flows: Opt.Option<Readonly<NonEmptyArray<string>>>
) => ReaderObservableEither<OnceNow, LogEntry, number>
const onceNowData: LogShared = flows =>
	flow(
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
) => RO.ReaderObservable<OnceNow, LogEntry>

export const logError: LogError = (message, flows) =>
	pipe(
		Opt.fromNullable(flows),
		onceNowData,
		ROEx.fold(
			entry =>
				ROx.concat2(
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

export type LogInfo = (
	message: string,
	flows?: Readonly<NonEmptyArray<string>>
) => RO.ReaderObservable<OnceNow, LogEntry>

export const logInfo: LogInfo = (message, flows) =>
	pipe(
		Opt.fromNullable(flows),
		onceNowData,
		ROEx.fold(
			entry =>
				ROx.concat2(
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
