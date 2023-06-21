/* eslint-disable functional/no-expression-statements */
import { Observable, first } from 'rxjs'

export class Single<T> extends Observable<T> {
	constructor(source$: Observable<T>) {
		super(source$.pipe(first()).subscribe)
	}
}
