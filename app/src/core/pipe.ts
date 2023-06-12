import {
	Observable,
	Observer,
	Subject,
	Subscribable,
	SubscriptionLike,
	Unsubscribable,
	of
} from 'rxjs'

export class Pipe<IN, OUT>
	implements Observer<IN>, Subscribable<OUT>, SubscriptionLike
{
	constructor(convert: (obs: Observable<IN>) => Observable<OUT>) {
		this._convert = convert
	}

	unsubscribe(): void {
		return this._subject.unsubscribe()
	}

	get closed() {
		return this._subject.closed
	}

	subscribe(observer: Partial<Observer<OUT>>): Unsubscribable {
		return this._convert(this._subject).subscribe(observer)
	}

	next(value: IN) {
		return this._subject.next(value)
	}
	error(err: any) {
		return this._subject.error(err)
	}
	complete() {
		return this._subject.complete()
	}

	private readonly _convert: (obs: Observable<IN>) => Observable<OUT>
	private readonly _subject: Subject<IN> = new Subject<IN>()
}
