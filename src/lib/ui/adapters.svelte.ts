import { type BackButtonListenerEvent, App as CAP } from '@capacitor/app'
import type { Cancel } from 'effect/Runtime'
import { onDestroy } from 'svelte'

import { Eff, LL, Log, MR, Q, Str } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

export interface EffectRunner<R> {
	runEffect: (eff: Eff.Effect<void, never, R>) => Cancel<void>
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

type ReturnTypes<T extends Record<string, (...args: unknown[]) => unknown>> = {
	[K in keyof T]: ReturnType<T[K]>
}

export function effectToStream<
	T extends Record<string, (...args: unknown[]) => unknown>,
>(f: T) {
	const queue = Eff.runSync(Q.unbounded<ReturnTypes<T>>())

	onDestroy(() => {
		Eff.runSync(queue.shutdown)
	})

	$effect(() => {
		const result = {} as ReturnTypes<T>
		for (const key in f) {
			result[key] = $state.snapshot(f[key]()) as ReturnTypes<T>[typeof key]
		}
		queue.unsafeOffer(result)
	})

	return Str.fromQueue(queue)
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
