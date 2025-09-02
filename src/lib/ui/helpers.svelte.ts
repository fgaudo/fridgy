import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as Queue from 'effect/Queue'
import type { Cancel } from 'effect/Runtime'
import * as Stream from 'effect/Stream'
import { onDestroy, onMount } from 'svelte'

import type { UseCases } from '$lib/business/app/use-cases.ts'

import { type EffectRunner, effectToStream } from './adapters.svelte.ts'

export function createCrashHandler(
	stateCallback: () => boolean,
	runner: EffectRunner<UseCases>,
	handleError: Effect.Effect<void>,
) {
	effectToStream({ state: stateCallback }).pipe(
		Stream.filter(({ state }) => state),
		Stream.tap(() =>
			Effect.sync(() => {
				sessionStorage.setItem(`crash`, `true`)
				window.location.reload()
			}),
		),
		Stream.runDrain,
		runner.runEffect,
	)

	onMount(() =>
		runner.runEffect(
			Effect.gen(function* () {
				const hasCrash = yield* Effect.sync(() =>
					sessionStorage.getItem(`crash`),
				)
				if (hasCrash !== `true`) return
				yield* Effect.sync(() => {
					sessionStorage.removeItem(`crash`)
				})
				yield* handleError
			}),
		),
	)
}

export type Update<S, M, R> = (state: S, message: M) => Command<M, R>[]

export type Command<M, R> = Effect.Effect<M, never, R>

interface Dispatcher<M> {
	dispatch: (m: M) => Effect.Effect<void>
	unsafeDispatch: (m: M) => Cancel<void>
}

export function makeDispatcher<S, M extends { _tag: string }, R>(
	mutableState: S,
	effectRunner: EffectRunner<R>,
	update: Update<S, M, R>,
	fatalMessage: (error: unknown) => M,
): Dispatcher<M> {
	const queue = Effect.runSync(Queue.unbounded<M>())

	let cancel: Cancel<unknown> | undefined

	onMount(() => {
		cancel = effectRunner.runEffect(
			Effect.scoped(
				Effect.gen(function* () {
					while (true) {
						yield* pipe(
							Effect.gen(function* () {
								const m = yield* Queue.take(queue)

								yield* Effect.logDebug(`Dispatched message "${m._tag}"`).pipe(
									Effect.annotateLogs({ message: m }),
								)

								const commands = update(mutableState, m)

								for (const command of commands) {
									yield* pipe(
										command,
										Effect.flatMap(m => queue.offer(m)),
										Effect.catchAllDefect(err =>
											Effect.logFatal(err).pipe(
												Effect.andThen(Queue.offer(queue, fatalMessage(err))),
											),
										),
										Effect.forkScoped,
									)
								}
							}),
							Effect.catchAllDefect(err =>
								Effect.logFatal(err).pipe(
									Effect.andThen(Queue.offer(queue, fatalMessage(err))),
								),
							),
						)
					}
				}),
			),
		)
	})

	onDestroy(() => {
		Effect.runSync(queue.shutdown)
		cancel?.()
	})

	const dispatch = (m: M) => queue.offer(m)

	return {
		dispatch,
		unsafeDispatch: flow(dispatch, effectRunner.runEffect),
	}
}
