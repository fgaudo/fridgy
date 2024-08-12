import {
	type Accessor,
	onCleanup,
} from 'solid-js'
import type { SetStoreFunction } from 'solid-js/store'

import {
	C,
	Eff,
	Q,
	Str,
	pipe,
} from '@/core/imports'

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

export type DispatcherValue<STATE, CMD> =
	| { cmds: readonly CMD[] }
	| {
			mutation: (s: STATE) => STATE
	  }
	| {
			mutation: (s: STATE) => STATE
			cmds: readonly CMD[]
	  }

export const useQueue = <STATE, COMMAND>(
	mutate: SetStoreFunction<STATE>,
	transformer: (
		stream: Str.Stream<COMMAND>,
	) => Str.Stream<
		DispatcherValue<STATE, COMMAND>
	>,
) => {
	const queue = Eff.runSync(
		Q.unbounded<COMMAND>(),
	)

	Eff.runFork(
		transformer(Str.fromQueue(queue)).pipe(
			Str.runForEach(params =>
				Eff.gen(function* () {
					if ('mutation' in params)
						yield* Eff.sync(() => {
							mutate(params.mutation)
						})
					if ('cmds' in params) {
						for (const cmd of params.cmds) {
							yield* Eff.sleep(2000)
							yield* Q.offer(queue, cmd)
						}
					}
				}),
			),
		),
		{ immediate: false },
	)

	onCleanup(() => {
		Eff.runFork(Q.shutdown(queue))
	})

	return (command: COMMAND) => {
		Eff.runFork(Q.offer(queue, command))
	}
}
