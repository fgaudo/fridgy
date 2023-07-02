import { Exception } from '@/core/exception'
import { Either } from 'fp-ts/lib/Either'
import { Single } from 'src/core/single'

export type OnceNow = NonNullable<Single<Either<Exception, number>>>
