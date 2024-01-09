import * as E from 'fp-ts/lib/Either'
import { flow } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

export const mergeMapW: <E2, A, B>(
	f: (a: A) => Rx.Observable<E.Either<E2, B>>,
) => <E1>(
	obs: Rx.Observable<E.Either<E1, A>>,
) => Rx.Observable<E.Either<E1 | E2, B>> = f =>
	Rx.mergeMap(E.foldW(flow(E.left, Rx.of), f))

export const mergeMap: <E1, A, B>(
	f: (a: A) => Rx.Observable<E.Either<E1, B>>,
) => (
	obs: Rx.Observable<E.Either<E1, A>>,
) => Rx.Observable<E.Either<E1, B>> = mergeMapW
