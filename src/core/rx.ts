import { option as OPT } from 'fp-ts'
import { flow } from 'fp-ts/function'
import * as Rx from 'rxjs'

export function filterMap<A, B>(
	f: (a: A) => OPT.Option<B>
): (obs: Rx.Observable<A>) => Rx.Observable<B> {
	return flow(
		Rx.map(element => f(element)),
		Rx.filter(element => OPT.isSome(element)),
		Rx.map(b => (OPT.isSome(b) ? b.value : (undefined as never)))
	)
}
