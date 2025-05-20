import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import type { Cancel } from 'effect/Runtime'
import { onDestroy, onMount } from 'svelte'

import { Eff, LL, Log, MR, Q, Str, flow, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

export type Update<S, M, R> = (state: S, message: M) => Command<M, R>[]

export type Command<M, R> = Eff.Effect<M, never, R>

export interface EffectRunner<R> {
	runEffect: (eff: Eff.Effect<void, never, R>) => Cancel<void>
}

interface Dispatcher<M> {
	dispatch: (m: M) => Eff.Effect<void>
	unsafeDispatch: (m: M) => Cancel<void>
}

export function makeEffectRunner<R>(
	runtime: MR.ManagedRuntime<R, never>,
): EffectRunner<R> {
	const set = new Set<Cancel<unknown, unknown>>()
	let isDestroyed = false
	onDestroy(() => {
		isDestroyed = true
		set.forEach(cancel => {
			cancel()
		})
	})

	return {
		runEffect: eff => {
			if (isDestroyed) {
				return () => undefined
			}

			const cancel = runtime.runCallback(
				eff.pipe(
					withLayerLogging(`P`),
					Eff.provide(Log.minimumLogLevel(LL.Debug)),
					Eff.tapDefect(Eff.logFatal),
				),
				{
					onExit: () => {
						set.delete(cancel)
					},
				},
			)
			set.add(cancel)
			return cancel
		},
	}
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
										Eff.fork,
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

export function createCapacitorListener(event: `resume`): Str.Stream<void>
export function createCapacitorListener(
	event: `backButton`,
): Str.Stream<BackButtonListenerEvent>
export function createCapacitorListener<E extends `resume` | `backButton`>(
	event: E,
) {
	return Str.asyncPush<unknown>(emit =>
		Eff.acquireRelease(
			Eff.promise(() =>
				event === `resume`
					? CAP.addListener(event, () => emit.single(undefined))
					: CAP.addListener(event, e => emit.single(e)),
			),
			handle => Eff.promise(() => handle.remove()),
		),
	)
}
