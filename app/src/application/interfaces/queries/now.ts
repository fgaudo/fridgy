import { Exception } from '@/core/exception'
import { Either } from 'fp-ts/lib/Either'
import { Observable } from 'rxjs'

export type OnceNow = NonNullable<Observable<Either<Exception, number>>>
