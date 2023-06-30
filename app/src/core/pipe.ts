/* eslint-disable functional/immutable-data */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-classes */

/* eslint-disable functional/no-return-void */

/* eslint-disable functional/prefer-immutable-types */

/* eslint-disable functional/type-declaration-immutability */
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

export interface PipeNoUnsub<in IN, out OUT> extends Rx.Observable<OUT> {
	next: (value: IN) => void
}

export class Pipe<in out IN, in out OUT> implements PipeNoUnsub<IN, OUT> {
	constructor(transform: (obs: Rx.Observable<IN>) => Rx.Observable<OUT>) {
		const obs = this.source.pipe(transform)
		this.subscribe = obs.subscribe.bind(this)
		this.forEach = obs.forEach.bind(this)
		this.pipe = obs.pipe.bind(this)
		this.operator = obs.operator
		this.lift = obs.lift.bind(this)
		this.toPromise = obs.toPromise.bind(this)
		this.next = this.source.next.bind(this)
		this.unsubscribe = this.source.unsubscribe.bind(this)
	}

	subscribe: Rx.Observable<OUT>['subscribe']
	forEach: Rx.Observable<OUT>['forEach']
	pipe: Rx.Observable<OUT>['pipe']
	unsubscribe: Rx.Subject<IN>['unsubscribe']
	next: Rx.Subject<IN>['next']

	/** @deprecated will be made private in v8 */
	source: Rx.Subject<IN> = new Rx.Subject<IN>()

	/** @deprecated will be removed in v8 */
	operator: Rx.Observable<OUT>['operator']

	/** @deprecated will be removed in v8 */
	lift: Rx.Observable<OUT>['lift']

	/** @deprecated will be removed in v8 */
	toPromise: Rx.Observable<OUT>['toPromise']
}
