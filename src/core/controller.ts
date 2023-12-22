import { Observable, Subject, SubscriptionLike } from 'rxjs'

export interface Controller<A, B> {
	readonly stream: Observable<B>
	next(a: A): void
}

export class CloseableController<A, B>
	implements SubscriptionLike, Controller<A, B>
{
	constructor(transformer: (a: Observable<A>) => Observable<B>) {
		this.subject = new Subject()
		this.stream = this.subject.pipe(transformer)
	}

	readonly stream: Observable<B>
	private readonly subject: Subject<A>

	unsubscribe(): void {
		this.subject.unsubscribe()
	}

	get closed(): boolean {
		return this.subject.closed
	}

	next(a: A): void {
		this.subject.next(a)
	}
}
