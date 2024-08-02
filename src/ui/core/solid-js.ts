import { function as F } from 'fp-ts'
import * as Rx from 'rxjs'
import {
	type Accessor,
	onCleanup,
} from 'solid-js'
import type { SetStoreFunction } from 'solid-js/store'

const pipe = F.pipe

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

export type DispatcherValue<CMD, STATE> =
	| {
			mutation: STATE
	  }
	| { cmds: readonly CMD[] }
	| {
			mutation: STATE
			cmds: readonly CMD[]
	  }

export const createDispatcher = <CMD, STATE>(
	mutate: SetStoreFunction<STATE>,
	transformer: (
		obs: Rx.Observable<CMD>,
	) => Rx.Observable<
		DispatcherValue<CMD, (s: STATE) => STATE>
	>,
) => {
	const subject = new Rx.Subject<CMD>()

	const dispatch = (cmd: CMD) => {
		if (!subject.closed) subject.next(cmd)
	}

	const subscription = pipe(
		subject,
		transformer,
	).subscribe(params => {
		if ('mutation' in params)
			mutate(params.mutation)
		if ('cmds' in params) {
			for (const cmd of params.cmds) {
				setTimeout(() => {
					dispatch(cmd)
				})
			}
		}
	})

	onCleanup(() => {
		subject.unsubscribe()
		subscription.unsubscribe()
	})

	return dispatch
}
