import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as LogLevel from 'effect/LogLevel'
import * as Logger from 'effect/Logger'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Queue from 'effect/Queue'
import type { Cancel } from 'effect/Runtime'
import * as Stream from 'effect/Stream'
import { onDestroy } from 'svelte'

import { withLayerLogging } from '$lib/core/logging.ts'

export interface EffectRunner<R> {
	runEffect: (eff: Effect.Effect<void, never, R>) => Cancel<void>
}

export function makeEffectRunner<R>(
	runtime: ManagedRuntime.ManagedRuntime<R, never>,
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
					Effect.provide(Logger.minimumLogLevel(LogLevel.Debug)),
					Effect.tapDefect(Effect.logFatal),
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

type ReturnTypes<T extends Record<string, (...args: unknown[]) => unknown>> = {
	[K in keyof T]: ReturnType<T[K]>
}

export function effectToStream<
	T extends Record<string, (...args: unknown[]) => unknown>,
>(f: T) {
	const queue = Effect.runSync(Queue.unbounded<ReturnTypes<T>>())

	onDestroy(() => {
		Effect.runSync(queue.shutdown)
	})

	$effect(() => {
		const result = {} as ReturnTypes<T>
		for (const key in f) {
			result[key] = $state.snapshot(f[key]()) as ReturnTypes<T>[typeof key]
		}
		queue.unsafeOffer(result)
	})

	return Stream.fromQueue(queue)
}

export function createCapacitorListener(event: `resume`): Stream.Stream<void>
export function createCapacitorListener(
	event: `backButton`,
): Stream.Stream<BackButtonListenerEvent>
export function createCapacitorListener<E extends `resume` | `backButton`>(
	event: E,
) {
	return Stream.asyncPush<unknown>(emit =>
		Effect.acquireRelease(
			Effect.promise(() =>
				event === `resume`
					? CAP.addListener(event, () => emit.single(undefined))
					: CAP.addListener(event, e => emit.single(e)),
			),
			handle => Effect.promise(() => handle.remove()),
		),
	)
}
