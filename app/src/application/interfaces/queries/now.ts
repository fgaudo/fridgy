import { Exception } from '@/core/exception'
import { ObservableEither } from 'fp-ts-rxjs/lib/ObservableEither'

export type OnceNow = NonNullable<ObservableEither<Exception, number>>
