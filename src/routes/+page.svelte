<script lang="ts">
	import { App as CAP } from '@capacitor/app';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import { HS, O } from '$lib/core/imports.ts';

	import { maybeExpirationDate } from '$lib/domain/product.ts';

	import imgUrl from '$lib/ui/assets/arrow.svg';
	import * as Home from '$lib/ui/home.ts';
	import Spinner from '$lib/ui/spinner.svelte';
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
		Utils.useCapacitorListener(() =>
			CAP.addListener('resume', () => {
				Home.refreshTime(state);
			}),
		);

	onMount(() => {
		fetchList();

		startResumeListener();

		startRefreshTimeInterval();
	});
</script>

{#if state.isLoading}
	<Spinner />
{:else}
	<div
		role="button"
		tabindex="0"
		onclick={() => {
			Home.toggleMenu(state);
		}}
		onkeydown={() => {
			Home.toggleMenu(state);
		}}
	>
		<div class="hidden h-full flex-col">
			<p
				class="text-title-large leading-title-large font-stylish pt-8 pb-4 pl-4"
			>
				Fridgy
			</p>

			<a href="/about">
				<div>About</div>
			</a>
			<a
				class="text-primary mt-auto inline-block w-fit self-center p-4 text-center underline"
				href="https://github.com/fgaudo/fridgy/wiki/Fridgy-%E2%80%90-Privacy-policy"
			>
				Privacy policy
			</a>
		</div>
	</div>

	<div
		class="bg-secondary shadow-secondary/50 flex h-16 w-full items-center shadow-md"
	>
		<div
			class="relative flex h-14 w-14 items-center justify-center"
		>
			{#if isSelectModeEnabled}
				<button
					class="material-symbols duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl transition-all"
					onclick={() => {
						Home.disableSelectMode(state);
					}}
				>
					close
				</button>
			{:else}
				<button
					class="material-symbols duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl transition-all"
					onclick={() => {
						Home.toggleMenu(state);
					}}
				>
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
		{#if !isSelectModeEnabled}
			<div
				class="flex h-full items-center text-lg transition-all"
			>
				{state.selected.size}
			</div>

			<button
				class="material-symbols text-2xl transition-all"
				onclick={() => {
					// TODO
				}}
			>
				delete
			</button>
		{/if}
	</div>
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
				class="fixed top-[64px] z-999 w-full px-[14px] pt-[10px] pb-[8px] text-xs transition-all"
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
					{@const maybeExpiration =
						product.maybeExpirationDate ??
						O.none()}

					{@const maybeCreation =
						(product.isValid
							? O.some(product.creationDate)
							: product.maybeCreationDate) ??
						O.none()}

					{@const maybeName =
						(product.isValid
							? O.some(product.name)
							: product.maybeName) ?? O.none()}
					<div
						class="duration-fade absolute flex shadow-sm transition-all left-1 right-1"
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
							onclick={e => {
								e.preventDefault();

								Home.toggleItemByTap(product.id)(
									state,
									isSelectModeEnabled,
								);
							}}
							oncontextmenu={e => {
								e.preventDefault();

								Home.toggleItemByHold(product.id)(
									state,
									isSelectModeEnabled,
								);
							}}
						>
							<div
								class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm transition-all"
							>
								{#if !isSelectModeEnabled && O.isSome(maybeExpiration) && maybeExpiration.value > state.currentTimestamp}
									<div
										class={[
											'text-primary duration-fade absolute text-xs transition-all',
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
												class="bg-primary h-full transition-all"
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
					{@const maybeName =
						product.maybeName ?? O.none()}
					<div
						class="duration-fade absolute flex shadow-sm transition-all left-1 right-1"
						style:top={`${(state.products.entries.length + index * 65).toString(10)}px`}
					>
						<button
							class="bg-background flex min-h-[60px] w-full select-none"
							style="content-visibility: 'auto'"
						>
							<div
								class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm transition-all"
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
				class="font-stylish fixed right-0 bottom-[150px] left-0 flex flex-col items-end transition-all duration-[fade]"
			>
				<div class="w-full p-[20px] text-center">
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
				class="bg-primary text-background duration-fade shadow-primary/70 fixed right-[16px] bottom-[20px] flex h-[96px] w-[96px] items-center justify-center rounded-4xl shadow-md transition-all"
			>
				<span class="material-symbols text-4xl">
					add
				</span>
			</a>
		{/if}
	{/if}
{/if}
