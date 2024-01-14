import { Reader } from 'fp-ts/Reader'
import { flip } from 'fp-ts/function'
import { Observable, Subject } from 'rxjs'

import { ViewModel } from './view-model'

export function fromViewModel<ENV, A, B>(
	viewModel: ViewModel<ENV, A, B>,
): Reader<ENV, Controller<A, B>> {
	return env =>
		new Controller(
			flip(viewModel.transformer)(env),
			viewModel.init,
		)
}

export class Controller<A, B> {
	public constructor(
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
