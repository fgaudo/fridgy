<script lang="ts">
	import { App as CAP } from '@capacitor/app';
	import { onMount } from 'svelte';

	import { useCapacitorListener } from '$lib/ui/utils.ts';

	export const prerender = false;
	export const ssr = false;

	let { children } = $props();

	const startBackButtonListener =
		useCapacitorListener(() =>
			CAP.addListener('backButton', e => {
				if (!e.canGoBack) {
					void CAP.exitApp();
					return;
				}
				window.history.back();
			}),
		);

	onMount(() => {
		startBackButtonListener();
	});
</script>

{@render children()}
