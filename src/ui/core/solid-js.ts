import * as Rx from 'rxjs'
import {
	type Accessor,
	onCleanup,
} from 'solid-js'

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

export const useDispatcher = <CMD>(
	transformer: (
		obs: Rx.Observable<CMD>,
	) => Rx.Observable<never>,
) => {
	const subject = new Rx.Subject<CMD>()

	const subscription =
		transformer(subject).subscribe()

	onCleanup(() => {
		subject.unsubscribe()
		subscription.unsubscribe()
	})

	return (cmd: CMD) => {
		if (!subject.closed) subject.next(cmd)
	}
}
