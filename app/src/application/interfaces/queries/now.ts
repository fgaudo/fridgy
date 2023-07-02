import { Exception } from '@/core/exception'
import { Either } from 'fp-ts/lib/Either'
import { Single } from 'src/core/single'

export type OnceNow = Single<Either<Exception, number>>
