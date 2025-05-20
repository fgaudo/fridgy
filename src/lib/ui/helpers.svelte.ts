import { onMount } from 'svelte'

import { Eff } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'

import type { EffectRunner } from './adapters.ts'

export function createCrashHandler(
	stateCallback: () => boolean,
	runner: EffectRunner<UseCases>,
	handleError: Eff.Effect<void>,
) {
	$effect(() =>
		stateCallback()
			? runner.runEffect(
					Eff.gen(function* () {
						yield* Eff.sync(() => {
							sessionStorage.setItem(`crash`, `true`)
						})
						yield* Eff.sync(() => {
							window.location.reload()
						})
					}),
				)
			: () => undefined,
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
