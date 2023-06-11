import { URI } from 'fp-ts-rxjs/Observable'
import * as E from 'fp-ts/lib/Either'
import { HKT, Kind, URIS } from 'fp-ts/lib/HKT'
import { switchMap, take } from 'rxjs'

export interface Take1<M extends URIS> {
	take: <A>(k: Kind<M, A>, n: number) => Kind<M, A>
}

export interface Take<M> {
	take: <A>(k: HKT<M, A>, n: number) => HKT<M, A>
}

export interface SwitchMap1<M extends URIS> {
	switchMap: <A, B>(ma: Kind<M, A>, f: (a: A) => Kind<M, B>) => Kind<M, B>
}

export interface SwitchMap<M> {
	switchMap: <A, B>(ma: HKT<M, A>, f: (a: A) => HKT<M, B>) => HKT<M, B>
}

type RetrievalError = string

export interface GetNow1<M extends URIS> {
	getNow: Kind<M, E.Either<RetrievalError, number>>
}

export interface GetNow<M> {
	getNow: HKT<M, E.Either<RetrievalError, number>>
}

export const Observable: SwitchMap1<URI> & Take1<URI> = {
	switchMap: (obs, f) => obs.pipe(switchMap(f)),
	take: (obs, n) => obs.pipe(take(n))
}
