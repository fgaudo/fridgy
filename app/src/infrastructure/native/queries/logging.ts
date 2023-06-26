import * as O from 'fp-ts-rxjs/Observable'
import * as D from 'fp-ts/lib/Date'
import * as E from 'fp-ts/lib/Either'
import * as IO from 'fp-ts/lib/IO'
import { match } from 'fp-ts/lib/ReadonlyArray'
import { pipe } from 'fp-ts/lib/function'

import { OnceError, OnceInfo } from '@/application/queries/logging'

import { Single, fromObservable } from '../../../core/single'

export const nativeOnceInfo: OnceInfo = (message, flows = []) =>
	fromObservable(
		pipe(
			createLog(message, flows),
			O.map(log => E.left({ ...log, level: 'info' }))
		)
	)

export const nativeOnceError: OnceError = (message, flows = ['']) =>
	fromObservable(
		pipe(
			createLog(message, flows),
			O.map(log => E.left({ ...log, level: 'error' }))
		)
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
