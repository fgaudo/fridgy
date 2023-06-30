/* eslint-disable functional/prefer-immutable-types */

/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/no-classes */
import * as Rx from 'rxjs'

export class Maybe<T> implements Rx.Observable<T> {
	constructor(source: Rx.Observable<T>) {
		this.source = source.pipe(Rx.take(1))

		this.subscribe = this.source.subscribe.bind(this)
		this.forEach = this.source.forEach.bind(this)
		this.pipe = this.source.pipe.bind(this)

		this.operator = this.source.operator
		this.toPromise = this.source.toPromise.bind(this)
		this.lift = this.source.lift.bind(this)
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
