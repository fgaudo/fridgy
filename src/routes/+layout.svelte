<script lang="ts">
	import { SafeArea } from '@capacitor-community/safe-area'
	import '@fontsource-variable/comfortaa/index.css'
	import '@fontsource-variable/roboto-flex/index.css'
	import * as Effect from 'effect/Effect'
	import * as ManagedRuntime from 'effect/ManagedRuntime'
	import * as Stream from 'effect/Stream'
	import { type Snippet, onDestroy, onMount } from 'svelte'
	import { fade } from 'svelte/transition'

	import Spinner from '$lib/components/spinner.svelte'
	import { setGlobalContext } from '$lib/context.ts'
	import { makeExecutor } from '$lib/executor'
	import '$lib/ui/assets/index.css'

	import { useCases } from '../business'

	let { children }: { children: Snippet } = $props()
	let isPageReady = $state(false)

	const pageLoader = Stream.fromEffect(
		Effect.all([
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
		]),
	)

	onMount(() => {
		const runtime = ManagedRuntime.make(useCases)
		const executor = makeExecutor(runtime)
		setGlobalContext({ executor: makeExecutor(runtime) })

		executor.runCallback(
			Stream.runForEach(pageLoader, () =>
				Effect.sync(() => {
					isPageReady = true
				}),
			),
		)

		onDestroy(() => {
			void runtime.dispose()
		})
	})
</script>

{#if isPageReady}
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
