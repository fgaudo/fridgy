<script lang="ts">
	import { App as CAP } from '@capacitor/app';
	import '@fontsource-variable/comfortaa/index.css';
	import '@fontsource-variable/roboto-flex/full.css';
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	import { Eff } from '$lib/core/imports.ts';

	import '$lib/ui/assets/index.css';
	import Spinner from '$lib/ui/components/spinner.svelte';
	import * as Utils from '$lib/ui/utils.ts';

	let { children } = $props();
	let areFontsLoaded = $state(false);

	const startBackButtonListener =
		Utils.useCapacitorListener({
			event: 'backButton',
			cb: e => {
				if (!e.canGoBack) {
					void CAP.exitApp();
					return;
				}
				window.history.back();
			},
		});

	const awaitFonts = Utils.useEffect(
		Eff.promise(async () => {
			await document.fonts.ready;
			areFontsLoaded = true;
		}),
	);

	onMount(() => {
		startBackButtonListener();

		awaitFonts();
	});
</script>

<div
	style:padding-top={'env(safe-area-inset-top, 0)'}
	style:padding-bottom={'env(safe-area-inset-bottom, 0)'}
	style:padding-left={'env(safe-area-inset-left, 0)'}
	style:padding-right={'env(safe-area-inset-right, 0)'}
>
	{#if areFontsLoaded}
		<div in:scale={{ start: 0.7 }}>
			{@render children()}
		</div>
	{:else}
		<div out:fade>
			<Spinner></Spinner>
		</div>
	{/if}
</div>
