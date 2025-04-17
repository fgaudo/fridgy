<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Infinity,
		Info,
		Menu,
		Plus,
		Trash2,
	} from '@lucide/svelte';
	import { format } from 'date-fns';
	import { onDestroy, onMount } from 'svelte';
	import { tap } from 'svelte-gestures';
	import { expoIn, expoOut } from 'svelte/easing';
	import {
		fade,
		fly,
		scale,
	} from 'svelte/transition';

	import {
		Eff,
		O,
		pipe,
	} from '$lib/core/imports.ts';
	import { asOption } from '$lib/core/utils.ts';

	import imgUrl from '$lib/ui/assets/arrow.svg';
	import Ripple from '$lib/ui/components/ripple.svelte';
	import Spinner from '$lib/ui/components/spinner.svelte';
	import { getUsecasesContext } from '$lib/ui/context.ts';
	import * as Store from '$lib/ui/pages/home/store.svelte';
	import * as Tasks from '$lib/ui/pages/home/tasks';
	import * as Utils from '$lib/ui/utils.ts';

	const store = Store.createStore();

	const useCases = getUsecasesContext();

	const startRefreshList = pipe(
		Tasks.refreshList(store),
		Eff.provide(useCases),
		Utils.createEffect,
	);

	const startResumeListener =
		Utils.createCapacitorListener({
			event: 'resume',
			cb: store.actions.refreshTime,
		});

	const startRefreshTimeInterval =
		Utils.createEffect(
			Tasks.refreshTimeInterval(store),
		);

	onMount(() => {
		startRefreshList();

		startResumeListener();

		startRefreshTimeInterval();
	});
</script>

<div in:fade>
	{#if store.state.isMenuOpen}
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
			class="h-screen flex-col flex fixed bg-background z-50 rounded-r-2xl overflow-hidden w-64 will-change-transform"
		>
			<p class="font-stylish pt-8 pb-4 pl-4">
				Fridgy
			</p>

			<div class="w-full p-4 flex relative">
				<Ripple
					ontap={() => {
						goto('/about');
					}}
				></Ripple>
				<Info />

				<div class="ml-4 flex items-center">
					About
				</div>
			</div>
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
			ontap={store.actions.toggleMenu}
			class="h-full z-40 flex-col fixed w-full bg-black/50 backdrop-blur-xs"
		></div>
	{/if}

	<div
		class="bg-secondary fixed shadow-secondary/40 flex h-16 w-full items-center shadow-md"
	>
		<div
			class="ml-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
		>
			{#if store.derived.isSelectModeEnabled}
				<Ripple
					ontap={store.actions.disableSelectMode}
				></Ripple>

				<span class="material-symbols text-2xl">
					close
				</span>
			{:else}
				<Ripple ontap={store.actions.toggleMenu}
				></Ripple>
				<Menu />
			{/if}
		</div>

		<div
			class="font-stylish pl-2 text-2xl font-bold translate-y-[2px]"
		>
			Fridgy
		</div>
		<div class="grow"></div>
		{#if store.derived.isSelectModeEnabled}
			<div
				class="flex h-full items-center text-lg font-stylish translate-y-[2px]"
			>
				{store.state.selected.size}
			</div>

			<div
				class="ml-2 mr-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
			>
				<Ripple ontap={() => {}}></Ripple>
				<Trash2 />
			</div>
		{/if}
	</div>
	<div class="bg-background min-h-screen">
		{#if store.state.receivedError}
			<div
				class="flex h-screen w-screen items-center justify-center text-center text-lg"
			>
				<div>
					Could not load the list! :(
					<br />
					<div
						class="text-primary underline relative overflow-hidden rounded-full py-1 px-2"
					>
						<Ripple ontap={startRefreshList}
						></Ripple>
						Try again
					</div>
				</div>
			</div>
		{:else if store.state.total > 0}
			<p
				class="fixed top-[64px] z-999 w-full px-[14px] pt-[10px] pb-[8px] text-xs"
			>
				{store.state.total} items
			</p>

			<div
				class="relative mt-[34px] flex w-full items-center"
				style:height={store.state.total > 0
					? `${((store.state.total - 1) * 65 + 185).toString(10)}px`
					: 'auto'}
			>
				{#each store.state.products.entries as product, index (product.id)}
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
						<div
							class={[
								'bg-background flex min-h-[60px] w-full select-none',
								{
									'bg-secondary/10':
										product.isSelected,
								},
							]}
							style="content-visibility: 'auto'"
						>
							<div
								class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm"
							>
								{#if !store.derived.isSelectModeEnabled && O.isSome(maybeExpiration) && maybeExpiration.value > store.state.currentTimestamp}
									<div
										class={[
											'text-primary duration-fade absolute text-xs ',
											{
												'text-red-500 font-bold':
													maybeExpiration.value <
													store.state
														.currentTimestamp,
											},
										]}
									>
										{Utils.formatRemainingTime(
											store.state
												.currentTimestamp,
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

									{#if expiration < store.state.currentTimestamp}
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
											store.state
												.currentTimestamp}
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
									<Infinity />
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
						</div>
					</div>
				{/each}
				{#each store.state.products.corrupts as product, index}
					{@const maybeName = asOption(
						product.maybeName,
					)}
					<div
						class="duration-fade absolute flex shadow-sm left-1 right-1"
						style:top={`${(store.state.products.entries.length + index * 65).toString(10)}px`}
					>
						<div
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
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="font-stylish fixed right-0 bottom-[150px] left-0 flex flex-col items-end duration-[fade]"
			>
				<div class="w-full p-[20px] text-center">
					Uh-oh, your fridge is looking a little
					empty! <br />
					Let’s fill it up!
				</div>
				<div
					style:filter={'invert(16%) sepia(2%) saturate(24%) hue-rotate(336deg) brightness(97%) contrast(53%)'}
					style:background-image={`url("${imgUrl}")`}
					class="relative top-[30px] right-[70px] h-[160px] w-[160px] bg-contain bg-no-repeat"
				></div>
			</div>
		{/if}
		{#if !store.derived.isSelectModeEnabled}
			<div
				class="bg-primary overflow-hidden text-background shadow-primary/70 fixed right-[16px] bottom-[20px] flex h-[96px] w-[96px] items-center justify-center rounded-4xl shadow-md"
			>
				<Ripple
					ontap={() => {
						goto('/add-product');
					}}
				></Ripple>
				<Plus size="36" />
			</div>
		{/if}
	</div>
</div>
