import {
	type BackButtonListener,
	App as CAP,
} from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import type { Cancel } from 'effect/Runtime'
import { onDestroy } from 'svelte'

import { Eff, L } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'

export function createRuntime(
	useCases: L.Layer<UseCases>,
) {
	const set = new Set<Cancel<unknown, unknown>>()

	let isDestroyed = false

	onDestroy(() => {
		isDestroyed = true

		set.forEach(cancel => {
			cancel()
		})
	})

	return (
		eff: Eff.Effect<unknown, unknown, UseCases>,
	) => {
		if (isDestroyed) {
			return () => {}
		}

		const cancel = Eff.runCallback(
			eff
				.pipe(Eff.tapDefect(Eff.logFatal))
				.pipe(Eff.provide(useCases)),
			{
				onExit: () => {
					set.delete(cancel)
				},
			},
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
			event: 'resume'
			cb: () => void
	  }
	| {
			event: 'backButton'
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
			event === 'resume'
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
