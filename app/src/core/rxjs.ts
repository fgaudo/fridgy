/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-return-void */

/* eslint-disable functional/functional-parameters */

/* eslint-disable functional/no-classes */

/* eslint-disable functional/no-expression-statements */
import * as O from 'fp-ts-rxjs/Observable'
import { Observable, first } from 'rxjs'

export class Single<T> extends Observable<T> {
	constructor(source$: Observable<T>) {
		super(source$.pipe(first()).subscribe)
	}

	private readonly _tag = 'CORE.Single'
}

export type Completable = Observable<never>

export const fromObservable: <T>(obs: Observable<T>) => Single<T> = obs =>
	obs instanceof Single ? obs : new Single(obs)

export const of: <A>(a: A) => Single<A> = a => fromObservable(O.of(a))
