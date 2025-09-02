<script lang="ts">
	import { SafeArea } from '@capacitor-community/safe-area'
	import '@fontsource-variable/comfortaa/index.css'
	import '@fontsource-variable/roboto-flex/index.css'
	import * as Effect from 'effect/Effect'
	import * as ManagedRuntime from 'effect/ManagedRuntime'
	import { type Snippet, onDestroy, onMount } from 'svelte'
	import { fade } from 'svelte/transition'

	import { useCases } from '$lib/business/index.ts'
	import * as Utils from '$lib/ui/adapters.svelte.ts'
	import '$lib/ui/assets/index.css'
	import Spinner from '$lib/ui/components/spinner.svelte'
	import { setGlobalContext } from '$lib/ui/context.ts'

	const runtime = ManagedRuntime.make(useCases)

	onDestroy(() => {
		void runtime.dispose()
	})

	let { children }: { children: Snippet } = $props()
	let areFontsLoaded = $state(false)

	const { runEffect } = Utils.makeEffectRunner(runtime)

	onMount(() => {
		setGlobalContext({ runtime })

		runEffect(
			Effect.gen(function* () {
				yield* Effect.all([
					Effect.promise(() =>
						Promise.all([
							document.fonts.ready,
							SafeArea.enable({
								config: {
									customColorsForSystemBars: true,
									statusBarColor: `#00000000`, // transparent
									statusBarContent: `dark`,
									navigationBarColor: `#00000000`, // transparent
									navigationBarContent: `light`,
								},
							}),
						]),
					),
					Effect.sleep(150),
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
