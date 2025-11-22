<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import Quote from '@lucide/svelte/icons/quote'
	import { endOfDay, getDayOfYear } from 'date-fns'
	import { pipe } from 'effect/Function'
	import * as Option from 'effect/Option'
	import { cubicIn, cubicOut } from 'svelte/easing'
	import { fade, fly } from 'svelte/transition'

	import * as Integer from '@/core/integer/integer.ts'
	import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

	import { useViewmodel } from '$lib/adapters.svelte.ts'
	import sayings from '$lib/assets/sayings.json' with { type: 'json' }
	import Ripple from '$lib/components/ripple.svelte'
	import Spinner from '$lib/components/spinner.svelte'
	import { PAGE_TRANSITION_Y } from '$lib/constants.ts'
	import { getGlobalContext } from '$lib/context.ts'

	import { Pages } from '../../business/index.ts'

	type State = {
		name: undefined | string
		hasInteractedWithName: boolean
		expirationDate: undefined | number
		currentDate: number
	}

	const { runtime } = getGlobalContext()

	const { viewModel } = $derived(
		useViewmodel({ runtime, makeViewModel: Pages.AddProduct.makeViewModel }),
	)

	const state = $state<State>({
		name: ``,
		hasInteractedWithName: false,
		expirationDate: undefined,
		currentDate: Date.now(),
	})

	const validName = $derived(NonEmptyTrimmedString.fromString(state.name ?? ``))

	const saying = sayings[getDayOfYear(Date.now()) % sayings.length]

	const submission = $derived.by(() => {
		if (Option.isSome(validName) && viewModel && !viewModel.state.isAdding) {
			return { isSubmittable: true, name: validName.value } as const
		}

		return { isSubmittable: false } as const
	})

	const isNameValidOrUntouched = $derived(
		Option.isSome(validName) || !state.hasInteractedWithName,
	)

	const maybeExpirationDate = $derived(
		pipe(
			Option.fromNullable(state.expirationDate),
			Option.flatMap(Integer.fromNumber),
		),
	)

	function setName(name: string) {
		state.hasInteractedWithName = true
		state.name = name
	}

	function setExpirationDate(date: string) {
		if (date.length <= 0) {
			state.expirationDate = undefined
			return []
		}
		state.expirationDate = endOfDay(Date.parse(date)).valueOf()
	}

	const formattedCurrentDate = $derived(
		new Date(state.currentDate).toISOString().substring(0, 10),
	)

	const formattedExpirationDateOrEmpty = $derived(
		state.expirationDate
			? new Date(state.expirationDate).toISOString().substring(0, 10)
			: ``,
	)
</script>

{#if !viewModel}
	<div>Loading</div>
{:else}
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
						if (!viewModel.state.isAdding) {
							window.history.back()
						}
					}}
				></Ripple>
				<ArrowLeft />
			</div>
			<div class="font-stylish pl-2 text-2xl">Add a product</div>
		</div>

		<figure class="font-stylish mx-auto max-w-screen-md p-8 opacity-50">
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
						`bg-background inline-block p-[4px] text-sm duration-500`,
						isNameValidOrUntouched ? `text-secondary` : `text-primary`,
					]}
				>
					Product name <span class="font-bold text-primary">*</span>
				</label>
				<input
					type="text"
					bind:value={() => state.name ?? ``, setName}
					placeholder="For example: Milk"
					enterkeyhint="done"
					id="name"
					class={[
						`h-16 transition-all focus:ring-0 shadow-none placeholder:text-gray-400 p-4 w-full  duration-500 rounded-[4px] border-0`,
						isNameValidOrUntouched ? `bg-secondary/5` : `bg-primary/15 `,
					]}
				/>
			</div>

			<div
				class={[`text-on-background flex flex-col rounded-xl align-middle `]}
			>
				<label
					for="expdate"
					class="bg-background text-secondary inline-block p-[4px] text-sm"
				>
					Expiration date
				</label>
				<div class="relative h-16">
					{#if Option.isNone(maybeExpirationDate)}
						<div
							class="h-full flex items-center text-gray-400 absolute focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-[4px] border-0 z-40 pointer-events-none"
						>
							No expiration
						</div>
					{/if}
					<input
						type="date"
						placeholder="Select a date"
						bind:value={() => formattedExpirationDateOrEmpty, setExpirationDate}
						tabindex="-1"
						id="expdate"
						class={[
							`absolute h-full focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-[4px] border-0`,
							{
								'opacity-0': Option.isNone(maybeExpirationDate),
							},
						]}
						min={formattedCurrentDate}
					/>
				</div>
			</div>
			<div class="flex w-full justify-end pt-8">
				<div class="w-48 relative h-12 items-center">
					<div
						class={[
							`px-6 justify-center transition-all duration-500 overflow-hidden bg-primary h-full items-center flex  text-background shadow-primary/70 rounded-full shadow-md `,
							{
								'opacity-15 ': !submission.isSubmittable,
							},
						]}
					>
						{#if submission.isSubmittable}
							<Ripple
								ontap={() => {
									viewModel.dispatch(
										Pages.AddProduct.Message.AddProduct({
											name: submission.name,
											maybeExpirationDate: Option.fromNullable(
												state.expirationDate,
											).pipe(Option.flatMap(Integer.fromNumber)),
										}),
									)
								}}
							></Ripple>
						{/if}
						Add product
					</div>
				</div>
			</div>
		</form>

		{#if viewModel.state.isLoading}
			<div
				class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
			>
				<Spinner />
			</div>
		{/if}

		{#key Option.isSome(viewModel.derived.maybeToastMessage)}
			<div
				in:fade={{
					duration: 300,
					easing: cubicIn,
				}}
				out:fade={{ duration: 100 }}
				style:bottom={`calc(var(--safe-area-inset-bottom, 0) + 21px)`}
				class="z-90 fixed flex left-0 right-0 bottom-3 items-center justify-center transition-all"
			>
				{#if Option.isSome(viewModel.derived.maybeToastMessage)}
					<div class="flex justify-center items-center px-8 w-full max-w-lg">
						<div
							id="toast-success"
							class="flex p-4 items-center w-full shadow-md mx-auto text-gray-500 bg-white rounded-lg"
							role="alert"
						>
							{#if viewModel.derived.maybeToastMessage.value.type === `success`}
								<div
									class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-green-500 rounded-lg"
								>
									<svg
										class="w-5 h-5"
										aria-hidden="true"
										xmlns="http://www.w3.org/2000/svg"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"
										/>
									</svg>
									<span class="sr-only">Check icon</span>
								</div>
							{:else}
								<div
									class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-red-500 rounded-lg dark:text-red-200"
								>
									<svg
										class="w-5 h-5"
										aria-hidden="true"
										xmlns="http://www.w3.org/2000/svg"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z"
										/>
									</svg>
									<span class="sr-only">Error icon</span>
								</div>
							{/if}
							<div class="ms-3 text-sm font-normal">
								{viewModel.derived.maybeToastMessage.value.message}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/key}
	</div>
{/if}
