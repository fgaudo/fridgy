<script lang="ts">
	import { fade } from 'svelte/transition'

	import { scale2 } from '../transitions.ts'

	type Props = {
		color?: string
	} & (
		| {
				ontap: () => void
				onhold?: () => void
		  }
		| {
				onhold: () => void
				ontap?: () => void
		  }
	)
	let timeoudId: NodeJS.Timeout | undefined
	let { isDown, downCoords } = $state<{
		isDown: boolean
		delayTimeout?: NodeJS.Timeout
		downCoords?: [number, number]
	}>({
		isDown: false,
	})

	let { ontap, onhold, color = `var(--color-secondary)` }: Props = $props()
</script>

<button
	onpointerdown={e => {
		clearTimeout(timeoudId)
		isDown = true
		downCoords = [e.pageX, e.pageY]

		if (onhold)
			timeoudId = setTimeout(() => {
				isDown = false
				onhold()
			}, 400)
	}}
	onpointermove={e => {
		if (downCoords === undefined) {
			return
		}

		const distance = Math.sqrt(
			Math.pow(downCoords[0] - e.pageX, 2) +
				Math.pow(downCoords[1] - e.pageY, 2),
		)

		if (distance >= 8) {
			isDown = false
			clearTimeout(timeoudId)
		}
	}}
	onpointerup={() => {
		if (!isDown) {
			return
		}
		ontap?.()
		isDown = false
		clearTimeout(timeoudId)
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
