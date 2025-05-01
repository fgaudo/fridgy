<script lang="ts">
	import { goto } from '$app/navigation'
	import {
		Infinity,
		Cross,
		Info,
		Menu,
		Plus,
		Trash2,
		X,
	} from '@lucide/svelte'
	import { format } from 'date-fns'
	import { onMount } from 'svelte'
	import { expoIn, expoOut } from 'svelte/easing'
	import { fade, fly } from 'svelte/transition'

	import { Eff, O } from '$lib/core/imports.ts'
	import { asOption } from '$lib/core/utils.ts'

	import imgUrl from '$lib/ui/assets/arrow.svg'
	import Ripple from '$lib/ui/components/ripple.svelte'
	import { createViewModel } from '$lib/ui/pages/home/view-model.svelte.ts'
	import * as Utils from '$lib/ui/utils.ts'

	const viewModel = createViewModel()

	Utils.toDetachedCallback(
		Eff.logInfo('User opened home page'),
	)()

	onMount(() => {
		viewModel.tasks.fetchList()
		viewModel.tasks.registerRefreshTimeListeners()
	})
</script>

<div in:fade>
	{#if viewModel.state.isMenuOpen}
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
			class="h-screen flex-col flex fixed bg-background z-999 rounded-r-2xl overflow-hidden w-64 will-change-transform"
		>
			<p class="font-stylish pt-8 pb-4 pl-4">
				Fridgy
			</p>

			<div class="w-full p-4 flex relative">
				<Ripple
					ontap={() => {
						goto('/about')
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
			onpointerup={viewModel.tasks.toggleMenu}
			class="h-full z-998 flex-col fixed w-full bg-black/50 backdrop-blur-xs"
		></div>
	{/if}

	<div
		class="bg-secondary z-50 fixed shadow-secondary/40 flex h-16 w-full items-center shadow-md"
	>
		<div
			class="ml-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
		>
			{#if viewModel.state.isSelectModeEnabled}
				<Ripple
					ontap={viewModel.tasks
						.disableSelectMode}
				></Ripple>

				<X />
			{:else}
				<Ripple
					color="var(--color-background)"
					ontap={viewModel.tasks.toggleMenu}
				></Ripple>
				<Menu />
			{/if}
		</div>

		<div
			class="font-stylish pl-2 text-2xl font-extrabold translate-y-[2px]"
		>
			Fridgy
		</div>
		<div class="grow"></div>
		{#if viewModel.state.isSelectModeEnabled}
			<div
				class="flex h-full items-center text-lg font-stylish translate-y-[2px]"
			>
				{viewModel.state.selected.size}
			</div>

			<div
				class="ml-2 mr-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
			>
				<Ripple
					ontap={viewModel.tasks.deleteSelected}
				></Ripple>
				<Trash2 />
			</div>
		{/if}
	</div>

	<div class="bg-background min-h-screen">
		{#if viewModel.state.receivedError}
			<div
				class="flex h-screen w-screen items-center justify-center text-center text-lg"
			>
				<div>
					Could not load the list! :(
					<br />
					<div
						class="text-primary underline relative overflow-hidden rounded-full py-1 px-2"
					>
						<Ripple
							ontap={viewModel.tasks.fetchList}
						></Ripple>
						Try again
					</div>
				</div>
			</div>
		{:else if viewModel.state.total > 0}
			<p
				class="bg-background fixed top-[64px] z-50 w-full px-[14px] pt-[10px] pb-[8px] text-xs"
			>
				{viewModel.state.total} items
			</p>

			<div
				class="absolute top-[110px] flex w-full items-center"
				style:height={viewModel.state.total > 0
					? `${((viewModel.state.total - 1) * 79 + 205).toString(10)}px`
					: 'auto'}
			>
				{#each viewModel.state.products.entries as product, index (product.id)}
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
						class={[
							'absolute flex left-2 right-2 shadow-sm rounded-lg py-1 overflow-hidden transition-all duration-250',
							product.isSelected
								? 'bg-accent/10 scale-[102%]'
								: 'bg-secondary/5',
						]}
						style:top={`${(index * 79).toString(10)}px`}
					>
						{#if viewModel.state.isSelectModeEnabled}
							<Ripple
								ontap={viewModel.tasks.toggleItem(
									product,
								)}
							></Ripple>
						{:else}
							<Ripple
								onhold={viewModel.tasks.toggleItem(
									product,
								)}
							></Ripple>
						{/if}
						<div
							class={[
								'justify-between flex min-h-[60px] w-full gap-1 select-none items-center',
							]}
							style="content-visibility: 'auto'"
						>
							<div
								class="p-2 h-full aspect-square"
							>
								<div
									class="flex-col flex bg-secondary text-background shadow-xs rounded-full items-center justify-center text-center h-full aspect-square"
								>
									{#if O.isSome(maybeExpiration)}
										<div
											class="text-lg font-bold leading-4"
										>
											{format(
												maybeExpiration.value,
												'd',
											)}
										</div>
										<div
											class="text-sm leading-4"
										>
											{format(
												maybeExpiration.value,
												'LLL',
											)}
										</div>
									{:else}
										<Infinity
											class="p-2 w-full h-full font-bold "
										/>
									{/if}
								</div>
							</div>

							<div
								class="flex-1 h-full flex justify-center flex-col leading-[16px] gap-2"
							>
								{#if O.isSome(maybeName)}
									<div
										class="overflow-ellipsis whitespace-nowrap overflow-hidden capitalize"
									>
										{maybeName.value}
									</div>
								{:else}
									<div>[NO NAME]</div>
								{/if}

								{#if O.isNone(maybeCreation)}
									No creation date
								{:else if O.isSome(maybeExpiration) && maybeExpiration.value > viewModel.state.currentTimestamp}
									{@const expiration =
										maybeExpiration.value}
									{@const creation =
										maybeCreation.value}

									{@const totalDuration =
										expiration - creation}
									{@const remainingDuration =
										expiration -
										viewModel.state
											.currentTimestamp}
									{@const currentProgress =
										remainingDuration /
										totalDuration}

									{@const currentProgressOrZero =
										totalDuration < 0
											? 0
											: currentProgress}

									{@const color = `color-mix(in srgb, var(--color-secondary) ${currentProgressOrZero * 100}%, var(--color-primary) ${(1 - currentProgressOrZero) * 100}%)`}

									<div
										style:outline-color={color}
										class="z-0 h-[4px] my-[2px] w-full outline-[1px]"
									>
										<div
											class="bg-primary h-full"
											style:background-color={color}
											style:width={`${(
												currentProgressOrZero *
												100
											).toString()}%`}
										></div>
									</div>
								{:else if O.isSome(maybeExpiration)}
									<div
										class="text-[12px] leading-[8px] text-primary font-bold"
									>
										Expired
									</div>
								{/if}
							</div>
							<div
								class="h-9/12 aspect-square flex items-center justify-center"
							>
								{#if O.isSome(maybeExpiration)}
									<div
										class={[
											'text-primary duration-fade absolute text-sm',
											{
												'text-primary font-bold':
													maybeExpiration.value <
													viewModel.state
														.currentTimestamp,
											},
										]}
									>
										{Utils.formatRemainingTime(
											viewModel.state
												.currentTimestamp,
											maybeExpiration.value,
										)}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
				{#each viewModel.state.products.corrupts as product, index}
					{@const maybeName = asOption(
						product.maybeName,
					)}
					<div
						class="duration-fade absolute flex shadow-sm left-1 right-1"
						style:top={`${(viewModel.state.products.entries.length + index * 65).toString(10)}px`}
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
	</div>
	{#if !viewModel.state.isSelectModeEnabled}
		<div
			class="bg-primary z-50 overflow-hidden text-background shadow-md shadow-on-background/30 fixed right-[16px] bottom-[20px] flex h-[96px] w-[96px] items-center justify-center rounded-4xl"
		>
			<Ripple
				ontap={() => {
					goto('/add-product')
				}}
			></Ripple>
			<Plus size="36" />
		</div>
	{/if}
</div>
