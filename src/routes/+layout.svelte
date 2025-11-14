<script lang="ts">
	import { SafeArea } from '@capacitor-community/safe-area'
	import '@fontsource-variable/comfortaa/index.css'
	import '@fontsource-variable/roboto-flex/index.css'
	import * as Effect from 'effect/Effect'
	import { type Snippet, onMount } from 'svelte'
	import { fade } from 'svelte/transition'

	import Spinner from '$lib/components/spinner.svelte'
	import { setGlobalContext } from '$lib/context.ts'
	import { makeExecutor } from '$lib/executor'
	import '$lib/ui/assets/index.css'

	import { capacitorRuntime } from '../business'

	let { children }: { children: Snippet } = $props()

	const pageLoader = Promise.all([
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
		Effect.runPromise(Effect.sleep(150)),
	])

	onMount(() => {
		setGlobalContext({ executor: makeExecutor(capacitorRuntime) })
	})
</script>

{#await pageLoader}
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
{:then _}
	<div in:fade={{ delay: 400 }}>
		{@render children()}
	</div>
{/await}
