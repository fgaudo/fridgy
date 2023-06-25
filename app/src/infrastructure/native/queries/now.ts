import { Exception } from '@/core/exception'
import { Single } from '@/core/single'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import { now } from 'fp-ts/lib/Date'
import { pipe } from 'fp-ts/lib/function'

import { OnceNow } from '@/application/queries/now'

export const nativeOnceNow: OnceNow = new Single(
	pipe(now, OE.fromIO<number, Exception>)
)
