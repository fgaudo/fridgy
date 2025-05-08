import * as R from 'effect/Ref'

import { A, Eff } from './imports.ts'

export type Update<S, M, R> = (
	state: S,
	message: M,
) => {
	state: S
	tasks?: Task<M, R>[]
}

export type Task<M, R> = Eff.Effect<M[], never, R>

export function createDispatcher<S, M, R>(
	ref: R.Ref<S>,
	update: Update<S, M, R>,
): (m: M[] | M) => Eff.Effect<void, never, R> {
	return arg =>
		Eff.gen(function* () {
			const messages = Array.isArray(arg)
				? arg
				: [arg]

			yield* Eff.all(
				A.map(messages, message =>
					Eff.gen(function* () {
						const { tasks } = yield* R.modify(
							ref,
							state => {
								const { state: newState, tasks } =
									update(state, message)
								return [{ tasks }, newState]
							},
						)

						if (tasks) {
							const dispatchesPerTask = A.map(
								tasks,
								task =>
									Eff.gen(function* () {
										const messages = yield* task

										yield* Eff.suspend(() =>
											createDispatcher(
												ref,
												update,
											)(messages),
										)
									}),
							)
							yield* Eff.all(dispatchesPerTask)
						}
					}),
				),
			)
		})
}
