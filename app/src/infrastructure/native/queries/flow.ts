import { Exception } from '@/core/exception'
import { Single } from '@/core/single'
import * as O from 'fp-ts-rxjs/Observable'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import * as R from 'fp-ts/Random'
import { pipe } from 'fp-ts/lib/function'

import { OnceFlow } from '@/application/queries/flow'

export const nativeOnceFlow: OnceFlow = new Single(
	pipe(
		O.fromIO(R.randomInt(0, 5000)),
		O.map(toString),
		OE.fromObservable<Exception, string>
	)
)
