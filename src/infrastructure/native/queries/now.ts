import * as OE from 'fp-ts-rxjs/ObservableEither'
import { now } from 'fp-ts/lib/Date'
import { pipe } from 'fp-ts/lib/function'

import { Exception } from '@/core/exception'

import { OnceNow } from '@/application/interfaces/queries/now'

export const nativeOnceNow: OnceNow = pipe(now, OE.fromIO<number, Exception>)
