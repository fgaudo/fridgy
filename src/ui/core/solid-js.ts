import { function as F } from 'fp-ts'
import * as Rx from 'rxjs'
import {
	type Accessor,
	onCleanup,
} from 'solid-js'

const pipe = F.pipe

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

export type DispatcherValue<CMD, STATE> =
	| {
			state: STATE
	  }
	| { cmds: readonly CMD[] }
	| {
			state: STATE
			cmds: readonly CMD[]
	  }

export const createDispatcher = <CMD, STATE>(
	mutate: (store: STATE) => void,
	transformer: (
		obs: Rx.Observable<CMD>,
	) => Rx.Observable<DispatcherValue<CMD, STATE>>,
) => {
	const subject = new Rx.Subject<CMD>()

	const dispatch = (cmd: CMD) => {
		if (!subject.closed) subject.next(cmd)
	}

	const subscription = pipe(
		subject,
		transformer,
	).subscribe(params => {
		if ('state' in params) mutate(params.state)
		if ('cmds' in params) {
			setTimeout(() => {
				for (const cmd of params.cmds) {
					dispatch(cmd)
				}
			})
		}
	})

	onCleanup(() => {
		subject.unsubscribe()
		subscription.unsubscribe()
	})

	return dispatch
}
