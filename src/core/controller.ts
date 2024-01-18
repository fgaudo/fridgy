import { Reader } from 'fp-ts/Reader'
import { flip } from 'fp-ts/function'
import { Observable, Subject } from 'rxjs'

import { ViewModel } from './view-model'

export function fromViewModel<ENV, IN, OUT, INIT>(
	viewModel: ViewModel<ENV, IN, OUT, INIT>,
): Reader<ENV, Controller<IN, OUT, INIT>> {
	return env =>
		new Controller(
			flip(viewModel.transformer)(env),
			viewModel.init,
		)
}

export class Controller<IN, OUT, INIT> {
	public constructor(
		transformer: (
			a: Observable<IN>,
		) => Observable<OUT>,
		public readonly init: INIT,
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
