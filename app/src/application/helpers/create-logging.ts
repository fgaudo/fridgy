import { Single } from '@/core/single'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import { now } from 'fp-ts/lib/Date'
import * as E from 'fp-ts/lib/Either'
import { Reader } from 'fp-ts/lib/Reader'
import { pipe } from 'fp-ts/lib/function'

import { LogEntry, OnceError, OnceInfo } from '../queries/logging'

type CreateErrorDeps = Readonly<{
	onceError: OnceError
}>

export const logError =
	<A>(
		message: string,
		flows?: readonly string[]
	): ((a: CreateErrorDeps) => Single<E.Either<LogEntry, A>>) =>
	deps =>
		pipe(
			deps.onceError(message, flows),
			OE.fold(
				error =>
					pipe(
						now,
						O.fromIO,
						O.map(timestamp =>
							E.left({
								timestamp,
								level: 'error',
								message: error.message
							} as const)
						)
					),
				OE.left
			),
			observable => new Single(observable)
		)

type CreateInfoDeps = Readonly<{
	onceInfo: OnceInfo
}>

export const logInfo =
	<A>(
		message: string,
		flows?: readonly string[]
	): Reader<CreateInfoDeps, Single<E.Either<LogEntry, A>>> =>
	deps =>
		pipe(
			deps.onceInfo(message, flows),
			OE.fold(
				error =>
					pipe(
						now,
						O.fromIO,
						O.map(timestamp =>
							E.left<LogEntry, A>({
								timestamp,
								level: 'error',
								message: error.message
							} as const)
						)
					),
				log => OE.left(log)
			),
			observable => new Single(observable)
		)
