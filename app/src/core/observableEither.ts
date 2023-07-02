import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import { Apply2 } from 'fp-ts/lib/Apply'
import * as E from 'fp-ts/lib/Either'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

//////////////

type SwitchMapW = <ERR1, IN, OUT>(
	f: (in_: IN, index: number) => OE.ObservableEither<ERR1, OUT>
) => <ERR2>(
	oe: OE.ObservableEither<ERR2, IN>
) => OE.ObservableEither<ERR1 | ERR2, OUT>

export const switchMapW: SwitchMapW = f =>
	flow(OE.chainW(flow(O.of, Rx.switchMap(f))))

//////////////

type SwitchMap = <ERR, IN, OUT>(
	f: (in_: IN, index: number) => OE.ObservableEither<ERR, OUT>
) => (oe: OE.ObservableEither<ERR, IN>) => OE.ObservableEither<ERR, OUT>

export const switchMap: SwitchMap = switchMapW

//////////////

export const URI = 'ObservableEither'

export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
	interface URItoKind2<E, A> {
		readonly [URI]: OE.ObservableEither<E, A>
	}
}

export const Apply: Apply2<URI> = {
	URI,
	ap: <E, A, B>(
		fab: OE.ObservableEither<E, (a: A) => B>,
		fa: OE.ObservableEither<E, A>
	) =>
		pipe(
			fab,
			OE.fold(Rx.throwError, OE.right),
			O.map(gab => (ga: E.Either<E, A>) => pipe(E.ap(ga)(gab))),
			O.ap(pipe(fa, OE.fold(Rx.throwError, OE.right))),
			Rx.catchError(OE.left)
		),
	map: (fa, f) => pipe(fa, O.map(E.map(f)))
}
