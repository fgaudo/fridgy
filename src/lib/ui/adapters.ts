import { type BackButtonListener, App as CAP } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import type { Cancel } from 'effect/Runtime'
import { onDestroy, onMount } from 'svelte'

import { Eff, MR, Q, flow, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

export type Update<S, M, R> = (state: S, message: M) => Command<M, R>[]

export type Command<M, R> = Eff.Effect<M, never, R>

interface EffectRunner<R> {
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

	onDestroy(() => {
		set.forEach(cancel => {
			cancel()
		})
	})

	return {
		runEffect: eff => {
			const cancel = runtime.runCallback(
				eff.pipe(withLayerLogging(`P`), Eff.tapDefect(Eff.logFatal)),
			)
			set.add(cancel)
			return cancel
		},
	}
}

export function makeDispatcher<S, M, R>(
	mutableState: S,
	effectRunner: EffectRunner<R>,
	update: Update<S, M, R>,
): Dispatcher<M> {
	const queue = Eff.runSync(Q.unbounded<M>())

	let cancel: Cancel<unknown> | undefined

	onMount(() => {
		cancel = effectRunner.runEffect(
			Eff.gen(function* () {
				while (true) {
					yield* pipe(
						Eff.gen(function* () {
							const m = yield* Q.take(queue)

							const commands = update(mutableState, m)

							for (const command of commands) {
								yield* pipe(
									command,
									Eff.flatMap(m => queue.offer(m)),
									Eff.catchAllDefect(err => Eff.logFatal(err)),
									Eff.fork,
								)
							}
						}),
						Eff.catchAllDefect(Eff.logFatal),
					)
				}
			}),
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

export function createCapacitorListener({
	event,
	cb,
}:
	| {
			event: `resume`
			cb: () => void
	  }
	| {
			event: `backButton`
			cb: BackButtonListener
	  }) {
	let listener: PluginListenerHandle | undefined
	let isDestroyed = false

	onDestroy(() => {
		isDestroyed = true
		void listener?.remove()
	})

	return () => {
		void listener?.remove()

		if (isDestroyed) {
			return
		}

		const promise =
			event === `resume`
				? CAP.addListener(event, () => {
						if (isDestroyed) {
							void listener?.remove()
							return
						}
						cb()
					})
				: CAP.addListener(event, e => {
						if (isDestroyed) {
							void listener?.remove()
							return
						}
						cb(e)
					})

		void promise.then(l => {
			if (isDestroyed) {
				void l.remove()
				return
			}
			listener = l
		})

		return () => {
			void listener?.remove()
		}
	}
}
