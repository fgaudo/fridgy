import type { Reader } from 'fp-ts/Reader'
import { flip } from 'fp-ts/function'
import { Observable, Subject } from 'rxjs'

import type { ViewModel } from './view-model'

export function fromViewModel<ENV, IN, OUT>(
	viewModel: ViewModel<ENV, IN, OUT>,
): Reader<ENV, Controller<IN, OUT>> {
	return env =>
		new Controller(flip(viewModel)(env))
}

export class Controller<IN, OUT> {
	public constructor(
		transformer: (
			a: Observable<IN>,
		) => Observable<OUT>,
	) {
		this.subject = new Subject<IN>()
		this.stream = this.subject.pipe(transformer)
	}

	readonly stream: Observable<OUT>

	next(a: IN): void {
		this.subject.next(a)
	}

	private readonly subject: Subject<IN>
}
