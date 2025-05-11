import * as R from 'effect/Ref'

import { A, Eff, flow } from './imports.ts'

export type Update<S, M, R> = (
	state: S,
	message: M,
) => {
	state: S
	commands: Command<M, R>[]
}

export type Command<M, R> = Eff.Effect<
	M,
	never,
	R
>

export function createDispatcher<S, M, R>(
	ref: R.Ref<S>,
	update: Update<S, M, R>,
): (
	command: Command<M, R>,
) => Eff.Effect<void, never, R> {
	return command =>
		Eff.gen(function* () {
			const message = yield* command

			const { commands } = yield* R.modify(
				ref,
				state => {
					const { state: newState, commands } =
						update(state, message)
					return [{ commands }, newState]
				},
			)

			if (commands) {
				const dispatchesPerTask = A.map(
					commands,
					flow(
						command =>
							Eff.suspend(() =>
								createDispatcher(
									ref,
									update,
								)(command),
							),
						Eff.forkDaemon,
					),
				)
				yield* Eff.all(dispatchesPerTask)
			}
		})
}
