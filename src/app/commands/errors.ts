import { Observable, Subject } from 'rxjs'

export interface Failure {
	name: string
	message: string
}

const failuresSubject: Subject<Failure> = new Subject<Failure>()

export const addFailure = (failure: Failure) => {
	failuresSubject.next(failure)
}

export const failure$: Observable<Failure> = failuresSubject
