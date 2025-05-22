import type { Cancel } from 'effect/Runtime'
import { onDestroy, onMount } from 'svelte'

import { Eff, Q, Str, flow, pipe } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'

import { type EffectRunner, effectToStream } from './adapters.svelte.ts'

export function createCrashHandler(
	stateCallback: () => boolean,
	runner: EffectRunner<UseCases>,
	handleError: Eff.Effect<void>,
) {
	effectToStream({ state: stateCallback }).pipe(
		Str.filter(({ state }) => state),
		Str.tap(() =>
			Eff.sync(() => {
				sessionStorage.setItem(`crash`, `true`)
				window.location.reload()
			}),
		),
		Str.runDrain,
		runner.runEffect,
	)

	onMount(() =>
		runner.runEffect(
			Eff.gen(function* () {
				const hasCrash = yield* Eff.sync(() => sessionStorage.getItem(`crash`))
				if (hasCrash !== `true`) return
				yield* Eff.sync(() => {
					sessionStorage.removeItem(`crash`)
				})
				yield* handleError
			}),
		),
	)
}

export type Update<S, M, R> = (state: S, message: M) => Command<M, R>[]

export type Command<M, R> = Eff.Effect<M, never, R>

interface Dispatcher<M> {
	dispatch: (m: M) => Eff.Effect<void>
	unsafeDispatch: (m: M) => Cancel<void>
}

export function makeDispatcher<S, M extends { _tag: string }, R>(
	mutableState: S,
	effectRunner: EffectRunner<R>,
	update: Update<S, M, R>,
	fatalMessage: (error: unknown) => M,
): Dispatcher<M> {
	const queue = Eff.runSync(Q.unbounded<M>())

	let cancel: Cancel<unknown> | undefined

	onMount(() => {
		cancel = effectRunner.runEffect(
			Eff.scoped(
				Eff.gen(function* () {
					while (true) {
						yield* pipe(
							Eff.gen(function* () {
								const m = yield* Q.take(queue)

								yield* Eff.logDebug(`Dispatched message "${m._tag}"`).pipe(
									Eff.annotateLogs({ message: m }),
								)

								const commands = update(mutableState, m)

								for (const command of commands) {
									yield* pipe(
										command,
										Eff.flatMap(m => queue.offer(m)),
										Eff.catchAllDefect(err =>
											Eff.logFatal(err).pipe(
												Eff.andThen(Q.offer(queue, fatalMessage(err))),
											),
										),
										Eff.forkScoped,
									)
								}
							}),
							Eff.catchAllDefect(err =>
								Eff.logFatal(err).pipe(
									Eff.andThen(Q.offer(queue, fatalMessage(err))),
								),
							),
						)
					}
				}),
			),
		)
	})

	onDestroy(() => {
		Eff.runSync(queue.shutdown)
		cancel?.()
	})

	const dispatch = (m: M) => queue.offer(m)

	return {
		dispatch,
		unsafeDispatch: flow(dispatch, effectRunner.runEffect),
	}
}
