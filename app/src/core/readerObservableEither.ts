import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as ROE from 'fp-ts-rxjs/lib/ReaderObservableEither'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

//////////////

type SwitchMapW = <ENV1, ERR1, IN, OUT>(
	f: (in_: IN) => ROE.ReaderObservableEither<ENV1, ERR1, OUT>
) => <ENV2, ERR2>(
	p: ROE.ReaderObservableEither<ENV2, ERR2, IN>
) => ROE.ReaderObservableEither<ENV1 & ENV2, ERR1 | ERR2, OUT>

export const switchMapW: SwitchMapW = f => roe => env =>
	pipe(
		roe(env),
		OE.chainW(
			flow(
				O.of,
				Rx.switchMap(in_ => f(in_)(env))
			)
		)
	)

//////////////

type SwitchMap = <ENV, ERR, IN, OUT>(
	f: (in_: IN) => ROE.ReaderObservableEither<ENV, ERR, OUT>
) => (
	p: ROE.ReaderObservableEither<ENV, ERR, IN>
) => ROE.ReaderObservableEither<ENV, ERR, OUT>

export const switchMap: SwitchMap = switchMapW

//////////////

type Concat2W = <ENV1, ENV2, ERR1, ERR2, A>(
	roe1: ROE.ReaderObservableEither<ENV1, ERR1, A>,
	roe2: ROE.ReaderObservableEither<ENV2, ERR2, A>
) => ROE.ReaderObservableEither<ENV1 & ENV2, ERR1 | ERR2, A>

export const concat2W: Concat2W = (roe1, roe2) => env =>
	Rx.concat(roe1(env), roe2(env))

//////////////

type CombineLatest2W = <ENV1, ENV2, ERR1, ERR2, A, B>(
	roe1: ROE.ReaderObservableEither<ENV1, ERR1, A>,
	roe2: ROE.ReaderObservableEither<ENV2, ERR2, B>
) => ROE.ReaderObservableEither<ENV1 & ENV2, ERR1 | ERR2, readonly [A, B]>

export const combineLatest2W: CombineLatest2W = (roe1, roe2) => env =>
	pipe(
		Rx.combineLatest([
			pipe(
				roe1(env),
				OE.fold(err => Rx.throwError(() => err), O.of)
			),
			pipe(
				roe2(env),
				OE.fold(err => Rx.throwError(() => err), O.of)
			)
		]),
		O.map(E.right),
		Rx.catchError(OE.left)
	)

//////////////

type CombineLatest2 = <ENV, ERR, A, B>(
	roe1: ROE.ReaderObservableEither<ENV, ERR, A>,
	roe2: ROE.ReaderObservableEither<ENV, ERR, B>
) => ROE.ReaderObservableEither<ENV, ERR, readonly [A, B]>

export const combineLatest2: CombineLatest2 = combineLatest2W

//////////////

type Fold = <ENV1, ENV2, E, A, B>(
	onLeft: (e: E) => RO.ReaderObservable<ENV2, B>,
	onRight: (a: A) => RO.ReaderObservable<ENV1, B>
) => <ENV3>(
	o: ROE.ReaderObservableEither<ENV3, E, A>
) => RO.ReaderObservable<ENV1 & ENV2 & ENV3, B>

export const fold: Fold = (onLeft, onRight) => roe => env =>
	pipe(
		roe(env),
		OE.fold(
			err => onLeft(err)(env),
			now => onRight(now)(env)
		)
	)
