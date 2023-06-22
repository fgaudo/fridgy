/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-return-void */

/* eslint-disable functional/functional-parameters */

/* eslint-disable functional/no-classes */

/* eslint-disable functional/no-expression-statements */
import * as O from 'fp-ts-rxjs/Observable'
import { pipe } from 'fp-ts/lib/function'
import { Observable, first } from 'rxjs'

export class Single<T> implements Observable<T> {
	constructor(source$: Observable<T>) {
		this.source = pipe(source$, first())
	}

	get subscribe() {
		return this.source.subscribe
	}

	get pipe() {
		return this.source.pipe
	}

	/** @deprecated **/
	get toPromise() {
		return this.source.toPromise
	}

	get forEach() {
		return this.source.forEach
	}

	/** @deprecated **/
	get lift() {
		return this.source.lift
	}

	/** @deprecated **/
	get operator() {
		return this.source.operator
	}

	/** @deprecated **/
	readonly source: Observable<T>
}

export type Completable = Observable<never>

export const fromObservable: <T>(obs: Observable<T>) => Single<T> = obs =>
	obs instanceof Single ? obs : new Single(obs)

export const of: <A>(a: A) => Single<A> = a => fromObservable(O.of(a))
