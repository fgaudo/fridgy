import {
	type Accessor,
	onCleanup,
} from 'solid-js'
import * as SS from 'solid-js/store'

import {
	Eff,
	F,
	H,
	HS,
	Q,
	pipe,
} from '@/core/imports.js'

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

export interface Task<MSG> {
	onStart?: (id: F.Fiber<unknown>) => MSG
	effect: Eff.Effect<MSG>
}

export type Reducer<STATE, MSG> = (
	snapshot: STATE,
	msg: MSG,
) => readonly [
	mutation: HS.HashSet<(state: STATE) => void>,
	commands: HS.HashSet<Task<MSG>>,
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

	const fiber = H.runForkWithLogs(
		pipe(
			Eff.gen(function* () {
				for (;;) {
					const msg = yield* Q.take(messages)
					const [mutations, commands] = reducer(
						SS.unwrap(state),
						msg,
					)

					if (HS.size(mutations) > 0) {
						setState(
							SS.produce(state => {
								for (const mutation of mutations) {
									mutation(state)
								}
							}),
						)
					}

					yield* pipe(
						commands,
						HS.map(({ effect, onStart }) =>
							Eff.gen(function* () {
								const fiber = yield* pipe(
									effect,
									Eff.flatMap(msg =>
										Q.offer(messages, msg),
									),
									Eff.forkScoped,
								)

								if (onStart) {
									yield* Q.offer(
										messages,
										onStart(fiber),
									)
								}
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
		H.runForkWithLogs(
			F.interrupt(fiber).pipe(
				Eff.andThen(Q.shutdown(messages)),
			),
		)
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
