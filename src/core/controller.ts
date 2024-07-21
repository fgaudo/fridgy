import { function as F, reader as R } from 'fp-ts'
import { Observable, Subject } from 'rxjs'

import type { R_Transformer } from './transformer'

const flip = F.flip

export function fromTransformer<ENV, IN, OUT>(
	transformer: R_Transformer<ENV, IN, OUT>,
): R.Reader<ENV, Controller<IN, OUT>> {
	return env =>
		new Controller(flip(transformer)(env))
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
