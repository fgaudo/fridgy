import { type BackButtonListener, App as CAP } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { format } from 'effect/Inspectable'
import { withMinimumLogLevel } from 'effect/Logger'
import type { Cancel } from 'effect/Runtime'
import { onDestroy } from 'svelte'

import { Eff, LL, MR, Ref, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'
import { type Command, type Update, createDispatcher } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'

export function createRunEffect(runtime: MR.ManagedRuntime<UseCases, never>) {
	const set = new Set<Cancel<unknown, unknown>>()

	let isDestroyed = false

	onDestroy(() => {
		isDestroyed = true

		set.forEach(cancel => {
			cancel()
		})
	})

	return (eff: Eff.Effect<unknown, unknown, UseCases>) => {
		if (isDestroyed) {
			return () => {}
		}

		const cancel = runtime.runCallback(
			eff.pipe(
				withLayerLogging(`P`),
				import.meta.env.PROD ? eff => eff : withMinimumLogLevel(LL.Debug),
				Eff.tapDefect(Eff.logFatal),
			),
		)
		set.add(cancel)

		return cancel
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
		listener?.remove()
	})

	return () => {
		listener?.remove()

		if (isDestroyed) {
			return
		}

		const promise =
			event === `resume`
				? CAP.addListener(event, () => {
						if (isDestroyed) {
							listener?.remove()
							return
						}
						cb()
					})
				: CAP.addListener(event, e => {
						if (isDestroyed) {
							listener?.remove()
							return
						}
						cb(e)
					})

		promise.then(l => {
			if (isDestroyed) {
				l.remove()
				return
			}
			listener = l
		})

		return () => {
			listener?.remove()
		}
	}
}

export const createDispatcherWithLogging =
	<S, M extends { _tag: string }, R>(
		ref: Ref.Ref<S>,
		update: Update<S, M, R>,
	) =>
	(command: Command<M, R>) =>
		pipe(
			command,
			Eff.tap(message =>
				Eff.logDebug(`Dispatched message ${message._tag}`).pipe(
					Eff.annotateLogs({
						message: format(message),
					}),
				),
			),
			createDispatcher(ref, update),
		)
