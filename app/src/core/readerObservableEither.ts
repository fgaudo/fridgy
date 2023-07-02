import * as OEx from '@/core/observableEither'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as ROE from 'fp-ts-rxjs/lib/ReaderObservableEither'
import { pipe } from 'fp-ts/lib/function'

//////////////

type SwitchMapW = <ENV1, ERR1, IN, OUT>(
	f: (in_: IN, index: number) => ROE.ReaderObservableEither<ENV1, ERR1, OUT>
) => <ENV2, ERR2>(
	p: ROE.ReaderObservableEither<ENV2, ERR2, IN>
) => ROE.ReaderObservableEither<ENV1 & ENV2, ERR1 | ERR2, OUT>

export const switchMapW: SwitchMapW = f => roe => env =>
	pipe(
		roe(env),
		OEx.switchMapW((in_, index) => f(in_, index)(env))
	)

//////////////

type SwitchMap = <ENV, ERR, IN, OUT>(
	f: (in_: IN, index: number) => ROE.ReaderObservableEither<ENV, ERR, OUT>
) => (
	p: ROE.ReaderObservableEither<ENV, ERR, IN>
) => ROE.ReaderObservableEither<ENV, ERR, OUT>

export const switchMap: SwitchMap = switchMapW

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
