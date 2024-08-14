import {
	type Accessor,
	onCleanup,
} from 'solid-js'
import * as SS from 'solid-js/store'

import {
	D,
	Eff,
	F,
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
	state: STATE,
	msg: MSG,
) => readonly [
	state: STATE,
	commands: readonly (
		| {
				type: 'task'
				onStart?: (id: F.Fiber<unknown>) => MSG
				effect: Eff.Effect<MSG, MSG>
		  }
		| {
				type: 'message'
				message: MSG
		  }
	)[],
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

	Eff.runFork(
		Eff.gen(function* () {
			for (;;) {
				const msg = yield* Q.take(messages)
				const [newState, commands] = reducer(
					SS.unwrap(state),
					msg,
				)
				setState(newState)

				for (const cmd of commands) {
					if (cmd.type === 'message') {
						const { message } = cmd

						yield* Q.offer(
							messages,
							message,
						).pipe(Eff.fork)

						continue
					}

					const deferred =
						yield* D.make<boolean>()

					const { onStart, effect } = cmd

					const fiber = yield* pipe(
						effect,
						Eff.tap(() => D.await(deferred)),
						Eff.matchEffect({
							onSuccess: msg =>
								Q.offer(messages, msg),
							onFailure: msg =>
								Q.offer(messages, msg),
						}),
						Eff.fork,
					)

					if (onStart)
						yield* Q.offer(
							messages,
							onStart(fiber),
						)

					yield* D.succeed(deferred, true)
				}
			}
		}),
		{ immediate: false },
	)

	onCleanup(() => {
		Eff.runFork(Q.shutdown(messages))
	})

	return [
		state,
		(command: MSG) => {
			Eff.runFork(Q.offer(messages, command))
		},
	] as const
}
