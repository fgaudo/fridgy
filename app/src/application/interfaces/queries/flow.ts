import { Exception } from '@/core/exception'
import { ObservableEither } from 'fp-ts-rxjs/lib/ObservableEither'
import { Either } from 'fp-ts/lib/Either'

export type OnceFlow = ObservableEither<Exception, string>
