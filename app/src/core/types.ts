import { URI } from 'fp-ts-rxjs/Observable'
import * as E from 'fp-ts/lib/Either'
import { HKT, Kind, URIS } from 'fp-ts/lib/HKT'
import { switchMap, take, withLatestFrom } from 'rxjs'

type RetrievalError = string

export interface GetNow1<M extends URIS> {
	getNow: Kind<M, E.Either<RetrievalError, number>>
}

export interface GetNow<M> {
	getNow: HKT<M, E.Either<RetrievalError, number>>
}
