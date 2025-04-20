<script lang="ts">
	import { press } from 'svelte-gestures';
	import { fade } from 'svelte/transition';

	import { scale2 } from '../transitions.ts';

	const ANIMATE_AFTER_ONHOLD_MS = 200;
	const ANIMATE_AFTER_ONTAP_MS = 80;
	const ONDOWN_DELAY_MS = 25;
	const ONHOLD_DELAY_MS = 400;

	let {
		isDown,
		pressDelay,
		isTapping,
		lastPressDown,
	} = $state<{
		isDown: boolean;
		pressDelay: NodeJS.Timeout | null;
		isTapping: boolean;
		lastPressDown: number;
	}>({
		isDown: false,
		pressDelay: null,
		lastPressDown: performance.now(),
		isTapping: false,
	});

	let {
		ontap,
		onpress: onhold,
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

	function handlePressDown() {
		if (isTapping) {
			return;
		}
		isDown = false;
		pressDelay = setTimeout(() => {
			isDown = true;
			pressDelay = null;
		}, ONDOWN_DELAY_MS);
	}

	function handleTap() {
		if (isTapping) {
			return;
		}
		isTapping = true;
		setTimeout(() => {
			isDown = false;
			isTapping = false;
			ontap?.();
		}, ANIMATE_AFTER_ONTAP_MS);
	}

	function handlePress() {
		if (isTapping) {
			return;
		}
		isDown = false;

		onhold?.();
	}

	function handleOnUp() {
		isDown = false;
	}

	function handleMove() {
		if (pressDelay) {
			clearTimeout(pressDelay);
		}
		isDown = false;
	}
</script>

{#if onhold && !ontap}
	<button
		use:press={() => ({
			triggerBeforeFinished: true,
			timeframe: ONHOLD_DELAY_MS,
		})}
		onpressdown={handlePressDown}
		onpress={handlePress}
		onpressmove={handleMove}
		onpressup={handleOnUp}
		class="absolute overflow-hidden h-full w-full top-0 left-0 z-30"
	>
		{@render content()}
	</button>
{:else if !onhold && ontap}
	<button
		use:press={() => ({ timeframe: 0 })}
		onpressdown={() => {
			if (isTapping) {
				return;
			}
			pressDelay = setTimeout(() => {
				isDown = true;
				pressDelay = null;
			}, ONDOWN_DELAY_MS);
		}}
		onpress={handleTap}
		onpressmove={handleMove}
		class="absolute overflow-hidden h-full w-full top-0 left-0 z-30"
	>
		{@render content()}
	</button>
{:else}
	<button
		use:press={() => ({
			triggerBeforeFinished: true,
			timeframe: ONHOLD_DELAY_MS,
		})}
		onpressdown={() => {
			if (isTapping) {
				return;
			}
			lastPressDown = performance.now();
			pressDelay = setTimeout(() => {
				isDown = true;
				pressDelay = null;
			}, ONDOWN_DELAY_MS);
		}}
		onpress={() => {
			if (isTapping) {
				return;
			}
			isTapping = true;
			setTimeout(() => {
				isDown = false;
				isTapping = false;

				onhold?.();
			}, ANIMATE_AFTER_ONHOLD_MS);
		}}
		onpressup={() => {
			if (isTapping) {
				return;
			}
			const now =
				performance.now() - lastPressDown;

			if (now < ONHOLD_DELAY_MS) {
				isTapping = true;

				setTimeout(() => {
					isDown = false;

					isTapping = false;
					ontap?.();
				}, ANIMATE_AFTER_ONTAP_MS);
			}
		}}
		onpressmove={handleMove}
		class="absolute overflow-hidden h-full w-full top-0 left-0 z-30"
	>
		{@render content()}
	</button>
{/if}

{#snippet content()}
	{#if isDown}
		<div
			in:scale2={{
				start: 0,
				duration: 500,
				opacity: 0.3,
			}}
			out:fade={{ duration: 200 }}
			style:background-color={color}
			class="aspect-square w-full absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full scale-200 opacity-20 brightness-100"
		></div>
	{/if}
{/snippet}
