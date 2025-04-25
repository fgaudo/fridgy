<script lang="ts">
	import interact from 'interactjs'
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'

	import { scale2 } from '../transitions.ts'

	let button: HTMLButtonElement | undefined

	let { isDown, delayTimeout, downCoords } =
		$state<{
			isDown: boolean
			delayTimeout?: NodeJS.Timeout
			downCoords?: [number, number]
		}>({
			isDown: false,
		})

	let {
		ontap,
		onpress: onhold,
		color = 'var(--color-secondary)',
	}: {
		color?: string
	} & (
		| {
				ontap: () => void
				onpress?: () => void
		  }
		| {
				onpress: () => void
				ontap?: () => void
		  }
	) = $props()

	onMount(() => {})
</script>

<button
	onpointerdown={() => {
		isDown = true
	}}
	onpointerup={() => {
		isDown = false
	}}
	onpointermove={() => {
		console.log('move')
	}}
	class="absolute overflow-hidden h-full w-full top-0 left-0 z-30"
>
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
</button>
