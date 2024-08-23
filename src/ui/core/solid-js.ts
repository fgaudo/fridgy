import {
	type Accessor,
	onCleanup,
} from 'solid-js'
import * as SS from 'solid-js/store'

import {
	A,
	Eff,
	F,
	H,
	Q,
	pipe,
} from '@/core/imports'

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

export type Reducer<STATE, MSG> = (
	snapshot: STATE,
	msg: MSG,
) => readonly [
	mutation: (s: STATE) => STATE,
	commands: readonly {
		onStart: (id: F.Fiber<unknown>) => MSG
		effect: Eff.Effect<MSG, MSG>
	}[],
]

export const useQueueStore = <
	STATE extends object,
	MSG,
>(
	init: STATE,
	reducer: Reducer<STATE, MSG>,
) => {
	const [state, setState] =
		SS.createStore<STATE>(init)

	const messages = Eff.runSync(Q.unbounded<MSG>())

	H.runForkWithLogs(
		pipe(
			Eff.gen(function* () {
				for (;;) {
					const msg = yield* Q.take(messages)
					const [mutation, commands] = reducer(
						SS.unwrap(state),
						msg,
					)

					setState(mutation)

					yield* pipe(
						commands,
						A.map(({ effect, onStart }) =>
							Eff.gen(function* () {
								const fiber = yield* pipe(
									effect,
									Eff.matchEffect({
										onSuccess: msg =>
											Q.offer(messages, msg),
										onFailure: msg =>
											Q.offer(messages, msg),
									}),
									Eff.forkScoped,
								)

								yield* Q.offer(
									messages,
									onStart(fiber),
								)
							}),
						),
						Eff.all,
					)
				}
			}),
			Eff.scoped,
		),
	)

	onCleanup(() => {
		H.runForkWithLogs(Q.shutdown(messages))
	})

	return [
		state,
		(command: MSG) => {
			H.runForkWithLogs(
				Q.offer(messages, command),
			)
		},
	] as const
}

export const useFiber = (
	effect: Eff.Effect<unknown>,
) => {
	const fiber = H.runForkWithLogs(effect)

	onCleanup(() => {
		H.runForkWithLogs(F.interrupt(fiber))
	})
}
