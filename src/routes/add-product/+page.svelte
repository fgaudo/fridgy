<script lang="ts">
	import {
		ArrowLeft,
		Quote,
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';

	import {
		Eff,
		O,
		pipe,
	} from '$lib/core/imports.ts';

	import Ripple from '$lib/ui/components/ripple.svelte';
	import Spinner from '$lib/ui/components/spinner.svelte';
	import { PAGE_TRANSITION_Y } from '$lib/ui/constants.ts';
	import { getUsecasesContext } from '$lib/ui/context.ts';
	import * as AP from '$lib/ui/pages/add-product/store.svelte.ts';
	import {
		addProduct,
		queueResetToast,
	} from '$lib/ui/pages/add-product/tasks.ts';
	import {
		createCapacitorListener,
		createEffect,
	} from '$lib/ui/utils.ts';

	const store = AP.createStore();

	const {
		state,
		derived,
		actions: {
			initNameIfNotSet,
			setExpiration,
			setName,
		},
	} = store;

	const useCases = getUsecasesContext();

	const startAddProduct = pipe(
		addProduct(store),
		Eff.provide(useCases),
		createEffect,
	);

	const startBack = createCapacitorListener({
		event: 'backButton',
		cb: () => {
			if (!derived.isOk) {
				window.history.back();
			}
		},
	});

	const startQueueResetToast = createEffect(
		queueResetToast(store),
	);

	$effect(() => {
		if (store.derived.toastHasMessage) {
			startQueueResetToast();
		}
	});

	onMount(() => {
		startBack();
	});
</script>

<div
	in:fly={{
		y: PAGE_TRANSITION_Y,
		opacity: 0,
		easing: cubicOut,
	}}
	class="bg-background flex h-screen flex-col justify-between opacity-100"
>
	<div
		class="bg-secondary shadow-secondary/40 flex h-16 w-full items-center shadow-md"
	>
		<div
			class="ml-2 text-center flex h-12 w-12 items-center justify-center relative overflow-hidden rounded-full"
		>
			<Ripple
				ontap={() => {
					window.history.back();
				}}
			></Ripple>
			<ArrowLeft />
		</div>
		<div class="font-stylish pl-2 text-2xl">
			Add a product
		</div>
	</div>
	<figure
		class="font-stylish mx-auto max-w-screen-md p-8 opacity-50"
	>
		<div
			class="mb-3 flex items-center justify-center"
		>
			<Quote fill="black" />

			<p class="ml-5">
				Italian Saying of the Day <br />
				(Roman dialect)
			</p>
		</div>
		<blockquote>
			<div
				class="flex items-center justify-center"
			>
				<p
					class="text-md mb-2 italic select-text"
				>
					Chi c'ha er pepe, lo mette alle rape; <br
					/>
					chi nun ce l'ha, le magna sciape.
				</p>
			</div>
			<p class="text-right text-sm"></p>
		</blockquote>
	</figure>

	<div
		class="flex w-full max-w-lg flex-col gap-5 px-8 pt-8 justify-center pb-32 mx-auto"
	>
		<div
			class="text-on-background flex flex-col rounded-xl align-middle"
		>
			<label
				for="name"
				class={[
					'bg-background inline-block p-[4px] text-sm duration-500',
					{
						'text-primary': !derived.isNameValid,
						'text-secondary':
							O.isNone(derived.maybeName) ||
							derived.isNameValid,
					},
				]}
			>
				Product name <span
					class="font-bold text-primary">*</span
				>
			</label>
			<input
				type="text"
				bind:value={
					derived.getNameOrEmpty, setName
				}
				onblur={initNameIfNotSet}
				placeholder="For example: Milk"
				id="name"
				class={[
					'h-16 transition-all focus:ring-0 shadow-none placeholder:text-gray-400 p-4 w-full  duration-500 rounded-[4px] border-0',
					{
						'bg-primary/15': !derived.isNameValid,
						'bg-secondary/5':
							O.isNone(derived.maybeName) ||
							derived.isNameValid,
					},
				]}
			/>
		</div>

		<div
			class={[
				'text-on-background flex flex-col rounded-xl align-middle ',
			]}
		>
			<label
				for="expdate"
				class="bg-background text-secondary inline-block p-[4px] text-sm"
			>
				Expiration date
			</label>
			<div class="relative h-16">
				{#if O.isNone(derived.maybeExpirationDate)}
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
						derived.getExpiration, setExpiration
					}
					id="expdate"
					class={[
						'absolute h-full focus:ring-0 bg-secondary/5 shadow-none p-4 w-full rounded-[4px] border-0',
						{
							'opacity-0': O.isNone(
								derived.maybeExpirationDate,
							),
						},
					]}
					min={derived.formattedCurrentDate}
				/>
			</div>
		</div>
		<div class="flex w-full justify-end pt-8">
			<div
				class="w-48 relative h-12 items-center"
			>
				<div
					class={[
						'px-6 justify-center transition-all duration-500 overflow-hidden bg-primary h-full items-center flex  text-background shadow-primary/70 rounded-full shadow-md ',
						{
							'opacity-15 ':
								!derived.isOk || state.isAdding,
						},
					]}
				>
					{#if !state.isAdding && derived.isOk}
						<Ripple ontap={startAddProduct}
						></Ripple>
					{/if}
					Add product
				</div>
			</div>
		</div>
	</div>

	{#if store.state.isAdding}
		<div
			class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
		>
			<Spinner />
		</div>
	{/if}

	{#key store.derived.toastHasMessage}
		<div
			in:fade
			out:fade
			class="z-90 fixed flex left-0 right-0 bottom-3 items-center justify-center"
		>
			{#if store.derived.toastHasMessage}
				<div
					class="flex justify-center items-center px-8 w-full max-w-lg"
				>
					<div
						id="toast-success"
						class="flex p-4 items-center w-full shadow-md mx-auto text-gray-500 bg-white rounded-lg"
						role="alert"
					>
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
							<span class="sr-only"
								>Check icon</span
							>
						</div>
						<div class="ms-3 text-sm font-normal">
							{state.toastMessage}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/key}
</div>
