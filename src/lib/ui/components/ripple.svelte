<script lang="ts">
	import { infinity } from 'effect/Duration';
	import { press, tap } from 'svelte-gestures';
	import { fade } from 'svelte/transition';

	import { scale2 } from '../transitions.ts';

	let {
		showRipple: isRippleShown,
		isPressing,
		isTapping,
	} = $state<{
		showRipple: boolean;
		isPressing: boolean;
		isTapping: boolean;
	}>({
		showRipple: false,
		isPressing: false,
		isTapping: false,
	});

	const isAnimating = $derived(
		isTapping || isPressing,
	);

	let {
		ontap,
		onpress,
		color = 'var(--color-secondary)',
	}: {
		color?: string;
	} & (
		| {
				ontap: () => void;
				onpress?: () => void;
		  }
		| {
				onpress: () => void;
				ontap?: () => void;
		  }
	) = $props();

	const showRipple = function () {
		isRippleShown = true;
	};

	const hideRipple = function () {
		isRippleShown = false;
	};
</script>

<button
	use:tap={() => ({
		timeframe: +Infinity,
	})}
	use:press={() => ({
		timeframe: 500,
		triggerBeforeFinished: true,
	})}
	onpressdown={() => {
		if (isAnimating) return;
		if (onpress && !ontap) return;

		showRipple();
	}}
	onpressup={() => {
		if (isAnimating) return;

		hideRipple();
	}}
	ontap={() => {
		if (isAnimating) return;
		if (onpress && !ontap) return;

		isTapping = true;
		hideRipple();
	}}
	onpress={() => {
		if (isAnimating) return;
		if (!onpress) return;

		isPressing = true;
		showRipple();
		setTimeout(() => {
			hideRipple();
		});
	}}
	class="absolute overflow-hidden h-full w-full top-0 left-0 z-30"
>
	{#if isRippleShown}
		<div
			in:scale2={{
				start: 0,
				duration: 550,
				opacity: 0.3,
			}}
			onoutrostart={() => {
				if (isPressing) {
					onpress?.();
					isPressing = false;
				} else if (isTapping) {
					ontap?.();
					isTapping = false;
				}
			}}
			out:fade={{ duration: 450 }}
			style:background-color={color}
			class="aspect-square w-full absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full scale-200 opacity-20 brightness-200"
		></div>
	{/if}
</button>
