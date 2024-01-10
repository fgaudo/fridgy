import * as R from 'fp-ts/Reader'
import * as RIO from 'fp-ts/ReaderIO'
import { flip } from 'fp-ts/function'
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

export const exhaustMap: <ENV, A, B>(
	f: (a: A) => R.Reader<ENV, Rx.Observable<B>>,
) => (
	obs: R.Reader<ENV, Rx.Observable<A>>,
) => R.Reader<ENV, Rx.Observable<B>> = f =>
	R.chain(
		flip(env => Rx.exhaustMap(a => f(a)(env))),
	)

export const map: <A, B>(
	f: (a: A) => B,
) => <ENV>(
	obs: R.Reader<ENV, Rx.Observable<A>>,
) => R.Reader<ENV, Rx.Observable<B>> = f =>
	R.map(Rx.map(f))

export type ReaderObservableInputTuple<ENV, T> = {
	[K in keyof T]: R.Reader<
		ENV,
		Rx.Observable<T[K]>
	>
}
export function merge<
	ENV,
	A extends readonly unknown[],
>(
	...sources: [
		...ReaderObservableInputTuple<ENV, A>,
	]
): R.Reader<ENV, Rx.Observable<A[number]>> {
	return env => Rx.merge(sources.map(a => a(env)))
}
