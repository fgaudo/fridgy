/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-return-void */

/* eslint-disable functional/functional-parameters */

/* eslint-disable functional/no-classes */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/prefer-immutable-types */
import * as O from 'fp-ts-rxjs/Observable'
import * as Rx from 'rxjs'

export class Single<T> implements Rx.Observable<T> {
	constructor(source: Rx.Observable<T>) {
		this.source = source.pipe(Rx.first())

		this.subscribe = this.source.subscribe
		this.forEach = this.source.forEach
		this.pipe = this.source.pipe

		this.operator = this.source.operator
		this.toPromise = this.source.toPromise
		this.lift = this.source.lift
	}

	subscribe: typeof this.source.subscribe
	forEach: typeof this.source.forEach
	pipe: typeof this.source.pipe

	/** @deprecated make private in v8 */
	source: Rx.Observable<T>

	/** @deprecated remove in v8 */
	lift: typeof this.source.lift

	/** @deprecated remove in v8 */
	operator: typeof this.source.operator

	/** @deprecated remove in v8 */
	toPromise: typeof this.source.toPromise
}

export const fromObservable: <T>(obs: Rx.Observable<T>) => Single<T> = obs =>
	obs instanceof Single ? obs : new Single(obs)

export const of: <A>(a: A) => Single<A> = a => fromObservable(O.of(a))
