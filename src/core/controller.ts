import { Observable, Subject } from 'rxjs'

export class Controller<A, B> {
	constructor(transformer: (a: Observable<A>) => Observable<B>) {
		this.subject = new Subject<A>()
		this.stream = this.subject.pipe(transformer)
	}

	readonly stream: Observable<B>

	next(a: A): void {
		this.subject.next(a)
	}

	private readonly subject: Subject<A>
}
