import { Either } from 'fp-ts/lib/Either'
import { Single } from 'src/core/rxjs'

export type OnceNow = Single<Either<string, number>>
