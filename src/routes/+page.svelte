<script lang="ts">
	import { goto } from '$app/navigation';
	import { App as CAP } from '@capacitor/app';
	import { format } from 'date-fns';
	import { duration } from 'effect/Config';
	import { onMount } from 'svelte';
	import { tap } from 'svelte-gestures';
	import { expoIn, expoOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade, fly } from 'svelte/transition';

	import { O } from '$lib/core/imports.ts';
	import { asOption } from '$lib/core/utils.ts';

	import imgUrl from '$lib/ui/assets/arrow.svg';
	import Ripple from '$lib/ui/components/ripple.svelte';
	import Spinner from '$lib/ui/components/spinner.svelte';
	import * as Home from '$lib/ui/home.ts';
	import * as Utils from '$lib/ui/utils.ts';

	let state = $state<Home.State>({
		isMenuOpen: false,
		isLoading: false,
		selected: new SvelteSet(),
		receivedError: false,
		total: 0,
		products: {
			entries: [],
			corrupts: [],
		},
		currentTimestamp: Date.now(),
	});

	let isSelectModeEnabled = $derived(
		state.selected.size > 0,
	);

	const fetchList = Utils.useEffect(
		Home.fetchList(state),
	);

	const startRefreshTimeInterval =
		Utils.useEffect(
			Home.refreshTimeInterval(state),
		);

	const startResumeListener =
		Utils.useCapacitorListener({
			event: 'resume',
			cb: () => {
				Home.refreshTime(state);
			},
		});

	onMount(() => {
		fetchList();

		startResumeListener();

		startRefreshTimeInterval();
	});
</script>

{#if state.isLoading}
	<Spinner />
{:else}
	{#if state.isMenuOpen}
		<div
			in:fly={{
				x: -256,
				duration: 400,
				opacity: 0,
				easing: expoOut,
			}}
			out:fly={{
				x: -256,
				duration: 400,
				opacity: 1,
				easing: expoIn,
			}}
			class="h-screen flex-col flex fixed bg-background z-50 rounded-r-2xl overflow-hidden w-64"
		>
			<p class="font-stylish pt-8 pb-4 pl-4">
				Fridgy
			</p>

			<button class="w-full p-4 block relative">
				<Ripple
					onClick={() => {
						goto('/about');
					}}
				></Ripple>

				<div class="flex items-center">
					<div
						class="material-symbols text-2xl mr-4"
					>
						info
					</div>

					About
				</div>
			</button>
			<a
				class="text-primary block w-full pl-2 pr-2 pt-2 pb-4 text-center underline items-end mt-auto"
				href="https://github.com/fgaudo/fridgy/wiki/Fridgy-%E2%80%90-Privacy-policy"
			>
				Privacy policy
			</a>
		</div>
		<div
			role="presentation"
			in:fade={{
				duration: 400,
				easing: expoOut,
			}}
			out:fade={{
				duration: 400,
				easing: expoIn,
			}}
			use:tap={() => ({})}
			ontap={() => {
				Home.toggleMenu(state);
			}}
			class="h-full z-40 flex-col fixed w-full bg-black/50 backdrop-blur-xs"
		></div>
	{/if}

	<div
		class="bg-secondary fixed shadow-secondary/40 flex h-16 w-full items-center shadow-md"
	>
		<div
			class="ml-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
		>
			{#if isSelectModeEnabled}
				<button
					class="material-symbols duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl"
				>
					<Ripple
						onClick={() => {
							Home.disableSelectMode(state);
						}}
					></Ripple>

					close
				</button>
			{:else}
				<button
					class="material-symbols duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl"
				>
					<Ripple
						onClick={() => {
							Home.toggleMenu(state);
						}}
					></Ripple>

					menu
				</button>
			{/if}
		</div>

		<div
			class="font-stylish pl-2 text-2xl font-bold"
		>
			Fridgy
		</div>
		<div class="grow"></div>
		{#if isSelectModeEnabled}
			<div
				class="flex h-full items-center text-lg"
			>
				{state.selected.size}
			</div>

			<button
				class="material-symbols text-2xl"
				onclick={() => {
					// TODO
				}}
			>
				delete
			</button>
		{/if}
	</div>
	<div class="bg-background min-h-screen">
		{#if state.receivedError}
			<div
				class="absolute top-0 right-0 bottom-0 left-0 flex h-full w-full items-center justify-center text-center text-lg"
			>
				<p>
					Could not load the list! :(
					<br />
					<button
						class="text-primary underline"
						onclick={fetchList}
					>
						Try again
					</button>
				</p>
			</div>
		{:else}
			{#if state.total > 0}
				<p
					class="fixed top-[64px] z-999 w-full px-[14px] pt-[10px] pb-[8px] text-xs"
				>
					{state.total} items
				</p>

				<div
					class="relative mt-[34px] flex w-full items-center"
					style:height={state.total > 0
						? `${((state.total - 1) * 65 + 185).toString(10)}px`
						: 'auto'}
				>
					{#each state.products.entries as product, index (product.id)}
						{@const maybeExpiration = asOption(
							product.maybeExpirationDate,
						)}

						{@const maybeCreation = asOption(
							product.isValid
								? product.creationDate
								: product.maybeCreationDate,
						)}

						{@const maybeName = asOption(
							product.isValid
								? product.name
								: product.maybeName,
						)}
						<div
							class="duration-fade absolute flex shadow-sm left-1 right-1"
							style:top={`${(index * 65).toString(10)}px`}
						>
							<button
								class={[
									'bg-background flex min-h-[60px] w-full select-none',
									{
										'bg-secondary/10':
											product.isSelected,
									},
								]}
								style="content-visibility: 'auto'"
								onclick={() => {
									Home.toggleItemByTap(
										product.id,
									)(
										state,
										product,
										isSelectModeEnabled,
									);
								}}
								oncontextmenu={() => {
									Home.toggleItemByHold(
										product.id,
									)(
										state,
										product,
										isSelectModeEnabled,
									);
								}}
							>
								<div
									class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm"
								>
									{#if !isSelectModeEnabled && O.isSome(maybeExpiration) && maybeExpiration.value > state.currentTimestamp}
										<div
											class={[
												'text-primary duration-fade absolute text-xs ',
												{
													'text-red-500 font-bold':
														maybeExpiration.value <
														state.currentTimestamp,
												},
											]}
										>
											{Utils.formatRemainingTime(
												state.currentTimestamp,
												maybeExpiration.value,
											)}
										</div>
									{/if}
								</div>

								<div>
									{#if O.isNone(maybeCreation)}
										No creation date
									{:else if O.isSome(maybeExpiration)}
										{@const expiration =
											maybeExpiration.value}
										{@const creation =
											maybeCreation.value}

										{#if expiration < state.currentTimestamp}
											<p
												class="font-bold text-red-500"
											>
												Expired
											</p>
										{:else}
											{@const totalDuration =
												expiration - creation}
											{@const remainingDuration =
												expiration -
												state.currentTimestamp}
											{@const currentProgress =
												remainingDuration /
												totalDuration}

											<div
												class="border-primary mt-[5px] h-[5px] w-full border-[1px]"
											>
												<div
													class="bg-primary h-full"
													style:width={`${(
														currentProgress * 100
													).toString()}%`}
												></div>
											</div>
										{/if}
									{/if}
								</div>

								<div
									class="text-secondary flex w-[26px] flex-col items-center"
								>
									{#if O.isSome(maybeExpiration)}
										<div class="text-sm">
											{format(
												maybeExpiration.value,
												'd',
											)}
										</div>
										<div class="text-sm">
											{format(
												maybeExpiration.value,
												'LLL',
											)}
										</div>
									{:else}
										<span
											class="material-symbols text-4xl"
										>
											all_inclusive
										</span>
									{/if}
								</div>

								<div
									class="w-full overflow-hidden text-ellipsis whitespace-nowrap capitalize"
								>
									{#if O.isSome(maybeName)}
										{maybeName.value}
									{:else}
										[NO NAME]
									{/if}
								</div>
							</button>
						</div>
					{/each}
					{#each state.products.corrupts as product, index}
						{@const maybeName = asOption(
							product.maybeName,
						)}
						<div
							class="duration-fade absolute flex shadow-sm left-1 right-1"
							style:top={`${(state.products.entries.length + index * 65).toString(10)}px`}
						>
							<button
								class="bg-background flex min-h-[60px] w-full select-none"
								style="content-visibility: 'auto'"
							>
								<div
									class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm"
								></div>

								<div></div>

								<div
									class="text-secondary flex w-[26px] flex-col items-center"
								></div>

								<div
									class="w-full overflow-hidden text-ellipsis whitespace-nowrap capitalize"
								>
									{#if O.isSome(maybeName)}
										#CORRUPT# {maybeName.value}
									{:else}
										#CORRUPT# [NO NAME]
									{/if}
								</div>
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div
					class="font-stylish fixed right-0 bottom-[150px] left-0 flex flex-col items-end duration-[fade]"
				>
					<div
						class="w-full p-[20px] text-center"
					>
						Uh-oh, your fridge is looking a little
						empty! <br />
						Let’s fill it up!
					</div>
					<div
						style:filter={'invert(16%) sepia(2%) saturate(24%) hue-rotate(336deg) brightness(97%) contrast(93%)'}
						style:background-image={`url(${imgUrl})`}
						class="relative top-[30px] right-[70px] h-[160px] w-[160px] bg-contain bg-no-repeat"
					></div>
				</div>
			{/if}

			{#if !isSelectModeEnabled}
				<a
					role="button"
					href="/add-product"
					class="bg-primary text-background duration-fade shadow-primary/70 fixed right-[16px] bottom-[20px] flex h-[96px] w-[96px] items-center justify-center rounded-4xl shadow-md"
				>
					<span class="material-symbols text-4xl">
						add
					</span>
				</a>
			{/if}
		{/if}
	</div>
{/if}
