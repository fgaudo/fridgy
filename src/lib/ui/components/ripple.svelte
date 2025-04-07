<script lang="ts">
	import { tap } from 'svelte-gestures';
	import { fade } from 'svelte/transition';

	import { scale2 } from '../transitions.ts';

	let clicked = $state(false);

	let { onClick } = $props();

	const onDown = function () {
		clicked = true;
	};
	const onUp = function () {
		clicked = false;
	};
</script>

<div
	use:tap={() => ({})}
	ontapdown={onDown}
	ontapup={onUp}
	role="presentation"
	class="absolute overflow-hidden h-full w-full top-0 left-0 z-30"
>
	{#if clicked}
		<div
			in:scale2={{
				start: 0,
				duration: 550,
				opacity: 0.3,
			}}
			onoutrostart={onClick}
			out:fade={{ duration: 250 }}
			class="aspect-square w-full absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full scale-200 bg-primary opacity-30"
		></div>
	{/if}
</div>
