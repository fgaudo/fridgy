import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

//////////////

type SwitchMapW = <ENV1, IN, OUT>(
	project: (a: IN, index: number) => RO.ReaderObservable<ENV1, OUT>
) => <ENV2>(
	p: RO.ReaderObservable<ENV2, IN>
) => RO.ReaderObservable<ENV1 & ENV2, OUT>

export const switchMapW: SwitchMapW = project => ro => env =>
	pipe(
		ro(env),
		Rx.switchMap((in_, index) => project(in_, index)(env))
	)

//////////////

type SwitchMap = <ENV, IN, OUT>(
	project: (a: IN, index: number) => RO.ReaderObservable<ENV, OUT>
) => (p: RO.ReaderObservable<ENV, IN>) => RO.ReaderObservable<ENV, OUT>

export const switchMap: SwitchMap = switchMapW

//////////////

type DistinctUntilChanged = <A>(
	f: (prev: A, next: A) => boolean
) => <ENV>(p: RO.ReaderObservable<ENV, A>) => RO.ReaderObservable<ENV, A>

export const distinctUntilChanged: DistinctUntilChanged = f => ro => env =>
	pipe(ro(env), Rx.distinctUntilChanged(f))

//////////////

type Concat2W = <ENV1, ENV2, A>(
	roe1: RO.ReaderObservable<ENV1, A>,
	roe2: RO.ReaderObservable<ENV2, A>
) => RO.ReaderObservable<ENV1 & ENV2, A>

export const concat2W: Concat2W = (ro1, ro2) => env =>
	Rx.concat(ro1(env), ro2(env))

//////////////

type Concat2 = <ENV, A>(
	roe1: RO.ReaderObservable<ENV, A>,
	roe2: RO.ReaderObservable<ENV, A>
) => RO.ReaderObservable<ENV, A>

export const concat2: Concat2 = concat2W

//////////////

type CombineLatest2W = <ENV1, ENV2, A, B>(
	roe1: RO.ReaderObservable<ENV1, A>,
	roe2: RO.ReaderObservable<ENV2, B>
) => RO.ReaderObservable<ENV1 & ENV2, readonly [A, B]>

export const combineLatest2W: CombineLatest2W = (roe1, roe2) => env =>
	Rx.combineLatest([roe1(env), roe2(env)])

//////////////

type CombineLatest2 = <ENV, A, B>(
	roe1: RO.ReaderObservable<ENV, A>,
	roe2: RO.ReaderObservable<ENV, B>
) => RO.ReaderObservable<ENV, readonly [A, B]>

export const combineLatest2: CombineLatest2 = combineLatest2W
