import { Exception } from '@/core/exception'
import { Single } from '@/core/single'
import { Either } from 'fp-ts/lib/Either'

export type OnceFlow = Single<Either<Exception, string>>
