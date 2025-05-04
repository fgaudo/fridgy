<script lang="ts">
	import { App as CAP } from '@capacitor/app'
	import '@fontsource-variable/comfortaa/index.css'
	import '@fontsource-variable/roboto-flex/full.css'
	import { onDestroy, onMount } from 'svelte'
	import { fade, scale } from 'svelte/transition'

	import { Eff } from '$lib/core/imports.ts'

	import { useCases } from '$lib/business/index.ts'
	import '$lib/ui/assets/index.css'
	import Spinner from '$lib/ui/components/spinner.svelte'
	import * as Utils from '$lib/ui/utils.ts'

	let { children } = $props()
	let areFontsLoaded = $state(false)

	const startBackButtonListener =
		Utils.createCapacitorListener({
			event: 'backButton',
			cb: e => {
				if (!e.canGoBack) {
					void CAP.exitApp()
					return
				}
			},
		})

	const awaitFonts = Utils.toCallback(
		Eff.gen(function* () {
			yield* Eff.all([
				Eff.promise(() => document.fonts.ready),
				Eff.sleep(400),
			])

			areFontsLoaded = true
		}),
	)

	const disableContextMenu = () => {
		const f = (e: Event) => e.preventDefault()
		window.addEventListener('contextmenu', f)
		onDestroy(() =>
			window.removeEventListener(
				'contextmenu',
				f,
			),
		)
	}

	onMount(() => {
		startBackButtonListener()
		awaitFonts(undefined)
		disableContextMenu()
	})
</script>

<div
	style:padding-top="env(safe-area-inset-top, 0)"
	style:padding-bottom="env(safe-area-inset-bottom,0)"
	style:padding-left="env(safe-area-inset-left, 0)"
	style:padding-right="env(safe-area-inset-right,0)"
>
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
</div>
