<script lang="ts">
	import { Toast } from '@capacitor/toast'
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import Quote from '@lucide/svelte/icons/quote'
	import { endOfDay, getDayOfYear } from 'date-fns'
	import * as Option from 'effect/Option'
	import { cubicOut } from 'svelte/easing'
	import { fly } from 'svelte/transition'

	import * as Integer from '@/core/integer/integer.ts'

	import { useViewmodel } from '$lib/adapters.svelte.ts'
	import sayings from '$lib/assets/sayings.json' with { type: 'json' }
	import Ripple from '$lib/components/ripple.svelte'
	import Spinner from '$lib/components/spinner.svelte'
	import { PAGE_TRANSITION_Y } from '$lib/constants.ts'
	import { getGlobalContext } from '$lib/context.ts'

	import * as VM from './(add-product)/index.ts'

	type State = {
		hasInteractedWithName: boolean
	}

	const { runtime } = getGlobalContext()

	const state = $state<State>({
		hasInteractedWithName: false,
	})

	const { state: viewModelState } = $derived(
		useViewmodel({
			runtime,
			initState: VM.init,
			makeViewModel: VM.makeViewModel,
			messages: m => {
				if (m._tag === 'AddProductSucceeded') {
					void Toast.show({ text: 'Product added' })

					state.hasInteractedWithName = false
				} else if (m._tag === 'AddProductFailed') {
					void Toast.show({ text: 'Could not add product' })
				}
			},
		}),
	)

	const saying = sayings[getDayOfYear(Date.now()) % sayings.length]

	const formattedCurrentDate = $derived(
		new Date(Date.now()).toISOString().substring(0, 10),
	)
</script>

<div
	in:fly={{
		y: PAGE_TRANSITION_Y,
		opacity: 0,
		duration: 600,
		easing: cubicOut,
	}}
	class="bg-background flex flex-col justify-between h-screen opacity-100"
>
	<div
		style:padding-top={`var(--safe-area-inset-top)`}
		style:height={`calc(64px + var(--safe-area-inset-top))`}
		class="bg-secondary z-50 shadow-secondary/40 flex w-full items-center shadow-md"
	>
		<div
			class="ml-2 text-center flex h-12 w-12 items-center justify-center relative overflow-hidden rounded-full"
		>
			<Ripple
				ontap={() => {
					if (!viewModelState.isAdding) {
						window.history.back()
					}
				}}
			></Ripple>
			<ArrowLeft />
		</div>
		<div class="font-stylish pl-2 text-2xl">Add a product</div>
	</div>

	<figure class="font-stylish mx-auto max-w-3xl p-8 opacity-50">
		<div class="mb-3 flex items-center justify-center">
			<Quote fill="black" />

			<p class="ml-5">
				Italian Saying of the Day <br />
				(Roman dialect)
			</p>
		</div>
		<blockquote>
			<div class="flex items-center justify-center">
				<p class="text-md mb-2 italic select-text">
					“{@html saying}”
				</p>
			</div>
			<p class="text-right text-sm"></p>
		</blockquote>
	</figure>

	<form
		style:padding-bottom={`calc(var(--safe-area-inset-bottom, 0) + 128px)`}
		class="flex w-full max-w-lg flex-col gap-5 px-8 pt-8 justify-center mx-auto"
	>
		<div class="text-on-background flex flex-col rounded-xl align-middle">
			<label
				for="name"
				class={[
					`bg-background inline-block p-1 text-sm duration-500`,
					viewModelState.isNameValid || !state.hasInteractedWithName
						? `text-secondary`
						: `text-primary`,
				]}
			>
				Product name <span class="font-bold text-primary">*</span>
			</label>
			{#if viewModelState.canSetName._tag === 'True'}
				{@const setName = viewModelState.canSetName.setName}
				<input
					type="text"
					bind:value={
						() => {
							if (Option.isSome(viewModelState.maybeName)) {
								return viewModelState.maybeName.value
							}
							return ''
						},
						name => {
							state.hasInteractedWithName = true
							runtime.runCallback(setName(name))
						}
					}
					placeholder="For example: Milk"
					enterkeyhint="done"
					id="name"
					class={[
						`h-16 transition-all focus:ring-0 shadow-none placeholder:text-gray-400 p-4 w-full  duration-500 rounded-sm border-0`,
						viewModelState.isNameValid || !state.hasInteractedWithName
							? `bg-secondary/5`
							: `bg-primary/15 `,
					]}
				/>
			{:else}
				<input
					type="text"
					disabled
					placeholder="For example: Milk"
					enterkeyhint="done"
					id="name"
					class={[
						`h-16 transition-all focus:ring-0 shadow-none placeholder:text-gray-400 p-4 w-full  duration-500 rounded-sm border-0`,
					]}
				/>
			{/if}
		</div>

		<div class={[`text-on-background flex flex-col rounded-xl align-middle `]}>
			<label
				for="expdate"
				class="bg-background text-secondary inline-block p-1 text-sm"
			>
				Expiration date
			</label>
			<div class="relative h-16">
				{#if Option.isNone(viewModelState.maybeExpirationDate)}
					<div
						class="h-full flex items-center text-gray-400 absolute focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-sm border-0 z-40 pointer-events-none"
					>
						No expiration
					</div>
				{/if}
				{#if viewModelState.canSetExpirationDate._tag === 'True'}
					{@const setExpiratonDate =
						viewModelState.canSetExpirationDate.setExpirationDate}
					<input
						type="date"
						placeholder="Select a date"
						bind:value={
							() => {
								return Option.isSome(viewModelState.maybeExpirationDate)
									? new Date(viewModelState.maybeExpirationDate.value)
											.toISOString()
											.substring(0, 10)
									: ``
							},
							expirationDate => {
								if (expirationDate.length <= 0) {
									runtime.runCallback(setExpiratonDate(Option.none()))
									return []
								}

								runtime.runCallback(
									setExpiratonDate(
										Integer.fromNumber(
											endOfDay(Date.parse(expirationDate)).valueOf(),
										),
									),
								)
							}
						}
						tabindex="-1"
						id="expdate"
						class={[
							`absolute h-full focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-sm border-0`,
							{
								'opacity-0': Option.isNone(viewModelState.maybeExpirationDate),
							},
						]}
						min={formattedCurrentDate}
					/>
				{:else}
					<input
						type="date"
						placeholder="Select a date"
						disabled
						tabindex="-1"
						id="expdate"
						class={[
							`absolute h-full focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-sm border-0`,
							{
								'opacity-0': Option.isNone(viewModelState.maybeExpirationDate),
							},
						]}
						min={formattedCurrentDate}
					/>
				{/if}
			</div>
		</div>
		<div class="flex w-full justify-end pt-8">
			<div class="w-48 relative h-12 items-center">
				<div
					class={[
						`px-6 justify-center transition-all duration-500 overflow-hidden bg-primary h-full items-center flex  text-background shadow-primary/70 rounded-full shadow-md `,
						{
							'opacity-15 ': viewModelState.canSubmit._tag === 'False',
						},
					]}
				>
					{#if viewModelState.canSubmit._tag === 'True'}
						{@const submit = viewModelState.canSubmit.submit}
						<Ripple
							ontap={() => {
								runtime.runCallback(submit)
							}}
						></Ripple>
					{/if}
					Add product
				</div>
			</div>
		</div>
	</form>

	{#if viewModelState.isAdding}
		<div
			class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
		>
			<Spinner />
		</div>
	{/if}
</div>
