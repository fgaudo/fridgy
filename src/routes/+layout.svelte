<script lang="ts">
	import '@fontsource-variable/comfortaa/index.css'
	import '@fontsource-variable/roboto-flex/index.css'
	import { type Snippet, onDestroy, onMount } from 'svelte'
	import { fade } from 'svelte/transition'

	import { Eff, MR } from '$lib/core/imports.ts'

	import { useCases } from '$lib/business/index.ts'
	import * as Utils from '$lib/ui/adapters.svelte.ts'
	import '$lib/ui/assets/index.css'
	import Spinner from '$lib/ui/components/spinner.svelte'
	import { setGlobalContext } from '$lib/ui/context.ts'

	const runtime = MR.make(useCases)

	onDestroy(() => {
		void runtime.dispose()
	})

	let { children }: { children: Snippet } = $props()
	let areFontsLoaded = $state(false)

	const { runEffect } = Utils.makeEffectRunner(runtime)

	onMount(() => {
		setGlobalContext({ runtime })

		runEffect(
			Eff.gen(function* () {
				yield* Eff.all([
					Eff.promise(() => document.fonts.ready),
					Eff.sleep(150),
				])

				areFontsLoaded = true
			}),
		)
	})
</script>

{#if areFontsLoaded}
	<div in:fade={{ delay: 400 }}>
		{@render children()}
	</div>
{:else}
	<div
		out:fade
		class="absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center"
	>
		<Spinner
			height="96px"
			width="96px"
			fill="var(--color-secondary)"
			backgroundColor="transparent"
		></Spinner>
	</div>
{/if}
