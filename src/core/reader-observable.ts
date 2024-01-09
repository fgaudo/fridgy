import * as R from 'fp-ts/lib/Reader'
import * as RIO from 'fp-ts/lib/ReaderIO'
import { flip } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

export const tap: <ENV, A>(
	f: (a: A) => RIO.ReaderIO<ENV, void>,
) => (
	obs: R.Reader<ENV, Rx.Observable<A>>,
) => R.Reader<ENV, Rx.Observable<A>> = f =>
	R.chain(flip(env => Rx.tap(a => f(a)(env))))

export const switchMap: <ENV, A, B>(
	f: (a: A) => R.Reader<ENV, Rx.Observable<B>>,
) => (
	obs: R.Reader<ENV, Rx.Observable<A>>,
) => R.Reader<ENV, Rx.Observable<B>> = f =>
	R.chain(
		flip(env => Rx.switchMap(a => f(a)(env))),
	)

export const mergeMap: <ENV, A, B>(
	f: (a: A) => R.Reader<ENV, Rx.Observable<B>>,
) => (
	obs: R.Reader<ENV, Rx.Observable<A>>,
) => R.Reader<ENV, Rx.Observable<B>> = f =>
	R.chain(
		flip(env => Rx.mergeMap(a => f(a)(env))),
	)

export const map: <A, B>(
	f: (a: A) => B,
) => <ENV>(
	obs: R.Reader<ENV, Rx.Observable<A>>,
) => R.Reader<ENV, Rx.Observable<B>> = f =>
	R.map(Rx.map(f))
