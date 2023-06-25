import { Either } from 'fp-ts/lib/Either'
import { Single } from 'src/core/single'

export type OnceNow = Single<Either<string, number>>
