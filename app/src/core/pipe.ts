/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-classes */

/* eslint-disable functional/no-return-void */

/* eslint-disable functional/prefer-immutable-types */

/* eslint-disable functional/type-declaration-immutability */
import { pipe } from 'fp-ts/lib/function'
import {
	Observable,
	Observer,
	Subject,
	Subscribable,
	SubscriptionLike,
	Unsubscribable
} from 'rxjs'

export interface PipeNoUnsub<IN, OUT> extends Observer<IN>, Subscribable<OUT> {}

export class Pipe<IN, OUT> implements PipeNoUnsub<IN, OUT>, SubscriptionLike {
	constructor(
		private readonly transform: (obs: Observable<IN>) => Observable<OUT>
	) {}

	unsubscribe(): void {
		return this.subject.unsubscribe()
	}

	get closed() {
		return this.subject.closed
	}

	subscribe(observer: Partial<Observer<OUT>>): Unsubscribable {
		return pipe(this.subject, this.transform).subscribe(observer)
	}

	next(value: IN) {
		return this.subject.next(value)
	}
	error(err: unknown) {
		return this.subject.error(err)
	}
	complete() {
		return this.subject.complete()
	}

	private readonly subject: Subject<IN> = new Subject<IN>()
}
