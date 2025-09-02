<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import Quote from '@lucide/svelte/icons/quote'
	import { getDayOfYear } from 'date-fns'
	import * as Option from 'effect/Option'
	import { cubicIn, cubicOut } from 'svelte/easing'
	import { fade, fly } from 'svelte/transition'

	import sayings from '$lib/ui/assets/sayings.json' with { type: 'json' }
	import Ripple from '$lib/ui/components/ripple.svelte'
	import Spinner from '$lib/ui/components/spinner.svelte'
	import { PAGE_TRANSITION_Y } from '$lib/ui/constants.ts'

	import { createViewModel } from './(view-model)/index.svelte.ts'

	const viewModel = createViewModel()

	const saying = sayings[getDayOfYear(Date.now()) % sayings.length]
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
					viewModel.derived.isNameValidOrUntouched
						? `text-secondary`
						: `text-primary`,
				]}
			>
				Product name <span class="font-bold text-primary">*</span>
			</label>
			<input
				type="text"
				bind:value={() => viewModel.state.name, viewModel.tasks.setName}
				placeholder="For example: Milk"
				enterkeyhint="done"
				id="name"
				class={[
					`h-16 transition-all focus:ring-0 shadow-none placeholder:text-gray-400 p-4 w-full  duration-500 rounded-[4px] border-0`,
					viewModel.derived.isNameValidOrUntouched
						? `bg-secondary/5`
						: `bg-primary/15 `,
				]}
			/>
		</div>

		<div class={[`text-on-background flex flex-col rounded-xl align-middle `]}>
			<label
				for="expdate"
				class="bg-background text-secondary inline-block p-[4px] text-sm"
			>
				Expiration date
			</label>
			<div class="relative h-16">
				{#if Option.isNone(viewModel.derived.maybeExpirationDate)}
					<div
						class="h-full flex items-center text-gray-400 absolute focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-[4px] border-0 z-40 pointer-events-none"
					>
						No expiration
					</div>
				{/if}
				<input
					type="date"
					placeholder="Select a date"
					bind:value={
						() => viewModel.derived.formattedExpirationDateOrEmpty,
						viewModel.tasks.setExpirationDate
					}
					tabindex="-1"
					id="expdate"
					class={[
						`absolute h-full focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-[4px] border-0`,
						{
							'opacity-0': Option.isNone(viewModel.derived.maybeExpirationDate),
						},
					]}
					min={viewModel.derived.formattedCurrentDate}
				/>
			</div>
		</div>
		<div class="flex w-full justify-end pt-8">
			<div class="w-48 relative h-12 items-center">
				<div
					class={[
						`px-6 justify-center transition-all duration-500 overflow-hidden bg-primary h-full items-center flex  text-background shadow-primary/70 rounded-full shadow-md `,
						{
							'opacity-15 ': !viewModel.derived.isSubmittable,
						},
					]}
				>
					{#if viewModel.derived.isSubmittable}
						<Ripple ontap={viewModel.tasks.addProduct}></Ripple>
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
