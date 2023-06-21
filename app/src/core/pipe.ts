/* eslint-disable functional/no-return-void */

/* eslint-disable functional/prefer-immutable-types */

/* eslint-disable functional/type-declaration-immutability */
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
		private readonly convert: (obs: Observable<IN>) => Observable<OUT>
	) {}

	unsubscribe(): void {
		return this._subject.unsubscribe()
	}

	get closed() {
		return this._subject.closed
	}

	subscribe(observer: Partial<Observer<OUT>>): Unsubscribable {
		return this.convert(this._subject).subscribe(observer)
	}

	next(value: IN) {
		return this._subject.next(value)
	}
	error(err: unknown) {
		return this._subject.error(err)
	}
	complete() {
		return this._subject.complete()
	}

	private readonly _subject: Subject<IN> = new Subject<IN>()
}
