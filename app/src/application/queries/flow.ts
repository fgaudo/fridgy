import { Exception } from '@/core/exception'
import { Single } from '@/core/single'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import { Either } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { LogEntry, OnceError, OnceInfo } from './logging'
import { OnceNow } from './now'

export type OnceFlow = Single<Either<Exception, string>>

type OnceFlowDeps<A> = {
	onceInfo: OnceInfo<A>
	onceError: OnceError<A>
	onceNow: OnceNow
	onceFlow: OnceFlow
}

export const onceRequestFlow =
	<A, B extends OnceFlowDeps<A>>(
		f: (requestFlow: string) => ROE.ReaderObservableEither<B, LogEntry, A>
	): ROE.ReaderObservableEither<B, LogEntry, A> =>
	deps =>
		pipe(
			deps.onceFlow,
			Rx.switchMap(either =>
				pipe(
					either,
					OE.fromEither,
					OE.fold(
						exception =>
							deps.onceError(
								`Could not create request flow: ${exception.message}`
							),
						requestFlow =>
							Rx.concat(
								deps.onceInfo(`Created request flow ${requestFlow}`),
								f(requestFlow)(deps)
							)
					)
				)
			)
		)
