<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import { cubicOut } from 'svelte/easing'
	import { fly } from 'svelte/transition'

	import licenses from '$lib/ui/assets/licenses.json' with { type: 'json' }
	import Ripple from '$lib/ui/components/ripple.svelte'
	import { PAGE_TRANSITION_Y, version } from '$lib/ui/constants'
</script>

<div
	in:fly={{
		y: PAGE_TRANSITION_Y,
		opacity: 0,
		easing: cubicOut,
	}}
>
	<div
		style:padding-top={`env(safe-area-inset-top)`}
		style:height={`calc(64px + env(safe-area-inset-top))`}
		class="bg-secondary shadow-secondary/40 fixed flex w-full items-center shadow-md z-20"
	>
		<div
			class="ml-2 text-center flex h-12 w-12 items-center justify-center relative overflow-hidden rounded-full"
		>
			<Ripple
				ontap={() => {
					window.history.back()
				}}
			></Ripple>
			<ArrowLeft />
		</div>
		<div class="font-stylish pl-2 text-2xl">About</div>
	</div>

	<div
		style:padding-top={`calc(env(safe-area-inset-top) + 92px)`}
		style:padding-bottom={'env(safe-area-inset-bottom)'}
		class="flex flex-col justify-center gap-2 px-[24px] bg-background"
	>
		<p class="font-stylish text-xl">Fridgy</p>
		<p class="mt-2">
			version:
			<span class="text-primary">
				{version}
			</span>
		</p>
		<p class="mt-2">© 2024 Francesco Gaudenzi</p>
		<p class="mt-2">
			This app is open source and released under the
			<a
				class="text-primary underline"
				href="https://www.gnu.org/licenses/agpl-3.0.en.html"
			>
				AGPL-3.0 license
			</a>. <br />The entire source code is available at
			<a class="text-primary underline" href="https://github.com/fgaudo/fridgy">
				https://github.com/fgaudo/fridgy
			</a>
		</p>

		<p class="mt-2">
			For any issues, requests or feedback you can
			<a
				class="text-primary underline"
				href="https://github.com/fgaudo/fridgy/issues"
			>
				open a ticket
			</a>
			or send me an email at
			<a class="text-primary underline" href="mailto:fgaudo@gmail.com">
				fgaudo@gmail.com
			</a>.
		</p>

		<p class="mt-5 mb-3">
			Fridgy uses many other open source libraries.
			<br /> Here's the complete list of software.
		</p>

		{#each Object.entries(licenses) as [name, license] (name)}
			<div
				class="mb-[20px] overflow-x-auto text-nowrap"
				style:content-visibility={`auto`}
			>
				{#if `name` in license && license.name.trim().length > 0}
					<h1 class="font-bold">
						{license.name}
					</h1>
				{:else}
					<h1 class="font-bold">
						{name}
					</h1>
				{/if}
				{#if `description` in license && license.description}
					<p>{license.description}</p>
				{/if}
				{#if `publisher` in license && license.publisher}
					<p>{license.publisher}</p>
				{/if}
				{#if `email` in license && license.email}
					<p>{license.email}</p>
				{/if}
				{#if `copyright` in license && license.copyright}
					<p>{license.copyright}</p>
				{/if}
				{#if `licenses` in license && license.licenses}
					<p>{license.licenses}</p>
				{/if}
				{#if `repository` in license && license.repository}
					<a
						class="text-primary underline"
						href={encodeURI(license.repository)}
					>
						{license.repository}
					</a>
				{/if}
			</div>
		{/each}
	</div>
</div>
