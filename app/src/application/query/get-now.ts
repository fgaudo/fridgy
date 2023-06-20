import { Either } from 'fp-ts/lib/Either'
import { Single } from 'src/core/rxjs'

export type Now$ = Single<Either<string, number>>
