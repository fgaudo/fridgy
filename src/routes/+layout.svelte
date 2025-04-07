<script lang="ts">
	import { App as CAP } from '@capacitor/app';
	import '@fontsource-variable/comfortaa/index.css';
	import '@fontsource-variable/material-symbols-outlined/fill.css';
	import '@fontsource-variable/roboto-flex/full.css';
	import { onMount } from 'svelte';
	import { cubicIn } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';

	import { Eff } from '$lib/core/imports.ts';

	import '$lib/ui/assets/index.css';
	import Spinner from '$lib/ui/components/spinner.svelte';
	import {
		useCapacitorListener,
		useEffect,
		usePromise,
	} from '$lib/ui/utils.ts';

	export const ssr = false;

	let { children } = $props();
	let areFontsLoaded = $state(false);

	const startBackButtonListener =
		useCapacitorListener({
			event: 'backButton',
			cb: e => {
				if (!e.canGoBack) {
					void CAP.exitApp();
					return;
				}
				window.history.back();
			},
		});

	const awaitFonts = useEffect(
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

{#if areFontsLoaded}
	<div in:scale={{ start: 0.7 }}>
		{@render children()}
	</div>
{:else}
	<div out:fade>
		<Spinner></Spinner>
	</div>
{/if}
