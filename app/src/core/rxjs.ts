import { Observable, first, ignoreElements, take } from 'rxjs'

export class Single<T> extends Observable<T> {
	constructor(source$: Observable<T>) {
		super(source$.pipe(first()).subscribe)
	}
}

export class Maybe<T> extends Observable<T> {
	constructor(source$: Observable<T>) {
		super(source$.pipe(take(1)).subscribe)
	}
}

export class Completable extends Observable<never> {
	constructor(source$: Observable<unknown>) {
		super(source$.pipe(ignoreElements()).subscribe)
	}
}
