import { Reader } from 'fp-ts/lib/Reader'
import { flip } from 'fp-ts/lib/function'
import { Observable, Subject } from 'rxjs'

export interface R_Transformer<ENV, A, B> {
	init: B
	transformer: (
		a: Observable<A>,
	) => Reader<ENV, Observable<B>>
}

export function controller<ENV, A, B>(
	transformer: R_Transformer<ENV, A, B>,
): Reader<ENV, Controller<A, B>> {
	return env =>
		new Controller(
			flip(transformer.transformer)(env),
			transformer.init,
		)
}

export class Controller<A, B> {
	constructor(
		transformer: (
			a: Observable<A>,
		) => Observable<B>,
		public readonly init: B,
	) {
		this.subject = new Subject<A>()
		this.stream = this.subject.pipe(transformer)
	}

	readonly stream: Observable<B>

	next(a: A): void {
		this.subject.next(a)
	}

	private readonly subject: Subject<A>
}
