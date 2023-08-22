import * as OE from 'fp-ts-rxjs/ObservableEither'
import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { OnceFlow } from '../interfaces/queries/flow'
import { logError, logInfo } from './logging'

type OnceFlowDeps = Readonly<{
	onceInfo: OnceInfo
	onceError: OnceError
	onceFlow: OnceFlow
}>

export const onceRequestFlow =
	<A, B extends OnceFlowDeps>(
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
							logError<A>(
								`Could not create request flow: ${exception.message}`
							)(deps),
						requestFlow =>
							Rx.concat(
								logInfo<A>(`Created request flow ${requestFlow}`)(deps),
								f(requestFlow)(deps)
							)
					)
				)
			)
		)
