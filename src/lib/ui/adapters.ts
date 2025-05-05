import {
	type BackButtonListener,
	App as CAP,
} from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import type { Layer } from 'effect/Layer'
import type { Cancel } from 'effect/Runtime'
import { onDestroy } from 'svelte'

import { Eff } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import { useCases } from '$lib/business/index.ts'

function runCallback(
	effect: Eff.Effect<
		unknown,
		unknown,
		Layer.Success<UseCases>
	>,
	options?: { onExit: () => void },
) {
	return Eff.runCallback(
		effect
			.pipe(Eff.tapDefect(Eff.logFatal))
			.pipe(Eff.provide(useCases)),
		{ onExit: options?.onExit },
	)
}

export function toRestartableCallback(
	effect: Eff.Effect<
		unknown,
		unknown,
		Layer.Success<UseCases>
	>,
) {
	let cancel: Cancel<unknown, unknown> | undefined

	let isDestroyed = false

	onDestroy(() => {
		isDestroyed = true

		cancel?.()
	})

	return () => {
		cancel?.()

		if (isDestroyed) {
			return () => {}
		}

		cancel = runCallback(effect)

		return cancel
	}
}

export function toCallback(
	effect: Eff.Effect<
		unknown,
		unknown,
		Layer.Success<UseCases>
	>,
): () => Cancel<unknown, unknown> {
	const set = new Set<Cancel<unknown, unknown>>()

	let isDestroyed = false

	onDestroy(() => {
		isDestroyed = true

		set.forEach(cancel => {
			cancel()
		})
	})

	return () => {
		if (isDestroyed) {
			return () => {}
		}

		const cancel = runCallback(effect, {
			onExit: () => {
				set.delete(cancel)
			},
		})
		set.add(cancel)

		return cancel
	}
}

export function toCallbackWithParam<P>(
	effect: (
		param: P,
	) => Eff.Effect<
		unknown,
		unknown,
		Layer.Success<UseCases>
	>,
): (p: P) => Cancel<unknown, unknown> {
	const set = new Set<Cancel<unknown, unknown>>()

	let isDestroyed = false

	onDestroy(() => {
		isDestroyed = true

		set.forEach(cancel => {
			cancel()
		})
	})

	return param => {
		if (isDestroyed) {
			return () => {}
		}

		const cancel = runCallback(effect(param), {
			onExit: () => {
				set.delete(cancel)
			},
		})
		set.add(cancel)

		return cancel
	}
}

export function toDetachedCallback(
	effect: Eff.Effect<
		unknown,
		unknown,
		Layer.Success<UseCases>
	>,
) {
	return () => {
		runCallback(effect)
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
