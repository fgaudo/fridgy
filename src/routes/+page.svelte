<script lang="ts">
	import { goto } from '$app/navigation'
	import Inf from '@lucide/svelte/icons/infinity'
	import Info from '@lucide/svelte/icons/info'
	import Menu from '@lucide/svelte/icons/menu'
	import Plus from '@lucide/svelte/icons/plus'
	import Trash2 from '@lucide/svelte/icons/trash-2'
	import X from '@lucide/svelte/icons/x'
	import { format } from 'date-fns'
	import { flip } from 'svelte/animate'
	import { cubicIn, expoIn, expoOut } from 'svelte/easing'
	import { fade, fly } from 'svelte/transition'

	import { O } from '$lib/core/imports.ts'

	import imgUrl from '$lib/ui/assets/arrow.svg'
	import Ripple from '$lib/ui/components/ripple.svelte'
	import Spinner from '$lib/ui/components/spinner.svelte'
	import * as Utils from '$lib/ui/utils.ts'

	import { createViewModel } from './(viewmodel)/index.svelte.ts'

	const viewModel = createViewModel()
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
			style:padding-top={`var(--safe-area-inset-top)`}
			style:padding-bottom={`var(--safe-area-inset-bottom)`}
			class="touch-none pointer-events-auto h-screen flex-col flex fixed bg-background z-999 rounded-r-2xl overflow-hidden w-64 will-change-transform"
		>
			<p class="font-stylish pt-8 pb-4 pl-4">Fridgy</p>

			<div class="w-full p-4 flex relative">
				<Ripple
					ontap={() => {
						void goto(`/about`)
					}}
				></Ripple>
				<Info />

				<div class="ml-4 flex items-center">About</div>
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
			class="touch-none pointer-events-auto h-full z-998 flex-col fixed w-full bg-black/50 backdrop-blur-xs"
		></div>
	{/if}

	<div class="fixed w-full z-50 top-0">
		<div
			style:padding-top={`var(--safe-area-inset-top)`}
			style:height={`calc(64px + var(--safe-area-inset-top))`}
			class="bg-secondary shadow-secondary/40 flex w-full items-center shadow-md"
		>
			<div
				class="ml-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
			>
				{#if O.isSome(viewModel.derived.maybeNonEmptySelected)}
					<div class="absolute" transition:fade={{ duration: 200 }}>
						{#if !viewModel.state.isDeleteRunning}
							<Ripple ontap={viewModel.tasks.clearSelected}></Ripple>
						{/if}

						<X />
					</div>
				{:else}
					<div transition:fade={{ duration: 200 }} class="absolute">
						<Ripple
							color="var(--color-background)"
							ontap={viewModel.tasks.toggleMenu}
						></Ripple>
						<Menu />
					</div>
				{/if}
			</div>

			<div class="font-stylish pl-2 text-2xl font-extrabold translate-y-[2px]">
				Fridgy
			</div>
			<div class="grow"></div>
			{#if O.isSome(viewModel.derived.maybeNonEmptySelected)}
				<div
					transition:fade={{ duration: 200 }}
					class="relative flex h-full items-center text-lg font-stylish translate-y-[2px]"
				>
					{#key viewModel.derived.maybeNonEmptySelected.value.size}
						<div class="absolute" transition:fade={{ duration: 200 }}>
							{viewModel.derived.maybeNonEmptySelected.value.size}
						</div>
					{/key}
				</div>

				<div
					class="ml-2 mr-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
					transition:fade={{ duration: 200 }}
				>
					{#if !viewModel.state.isDeleteRunning}
						<Ripple ontap={viewModel.tasks.deleteSelected}></Ripple>{/if}
					<Trash2 />
				</div>
			{/if}
		</div>
		{#if O.isSome(viewModel.derived.maybeLoadedProducts)}
			{@const products = viewModel.derived.maybeLoadedProducts.value}

			{#if products.entries.length > 0}
				<p
					out:fade={{ duration: 200 }}
					class="bg-background z-50 w-full px-[14px] pt-[10px] pb-[8px] text-xs"
				>
					{products.entries.length} items
				</p>
			{/if}
		{/if}
	</div>
	{#if viewModel.state.isLoading}
		<div
			transition:fade={{ duration: 200 }}
			class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
		>
			<Spinner />
		</div>
	{/if}

	<div class="bg-background flex flex-col">
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
						<Ripple ontap={viewModel.tasks.refreshList}></Ripple>
						Try again
					</div>
				</div>
			</div>
		{:else if O.isSome(viewModel.derived.maybeLoadedProducts)}
			{@const products = viewModel.derived.maybeLoadedProducts.value}

			<div
				style:padding-top={`calc(var(--safe-area-inset-top) + 64px + 42px)`}
				style:padding-bottom={`calc(var(--safe-area-inset-bottom) + 140px)`}
				out:fade={{ duration: 200 }}
				class="flex flex-1 gap-2 flex-col w-full"
			>
				{#each products.entries as product (product.id)}
					{@const maybeCreation = product.isCorrupt
						? O.none()
						: product.isValid
							? O.some(product.creationDate)
							: O.fromNullable(product.maybeCreationDate)}

					{@const maybeName = product.isCorrupt
						? O.fromNullable(product.maybeName)
						: product.isValid
							? O.some(product.name)
							: O.fromNullable(product.maybeName)}

					{@const maybeExpirationDate = product.isCorrupt
						? O.none()
						: O.fromNullable(product.maybeExpirationDate)}
					<div out:fade={{ duration: 200 }} animate:flip={{ duration: 250 }}>
						<div
							class={[
								`flex mx-2 relative transition-transform shadow-sm rounded-lg py-1 overflow-hidden`,
								!product.isCorrupt && product.isSelected
									? `bg-accent/10 scale-[102%]`
									: `bg-secondary/5`,
							]}
						>
							{#if !viewModel.state.isDeleteRunning}
								{#if products.selected.size > 0}
									<Ripple ontap={() => viewModel.tasks.toggleItem(product)}
									></Ripple>
								{:else}
									<Ripple onhold={() => viewModel.tasks.toggleItem(product)}
									></Ripple>
								{/if}
							{/if}
							<div
								class={[
									`justify-between flex min-h-[60px] w-full gap-1 select-none items-center`,
								]}
								style="content-visibility: 'auto'"
							>
								<div class="p-2 h-full aspect-square">
									<div
										class="flex-col flex bg-secondary text-background shadow-xs rounded-full items-center justify-center text-center h-full aspect-square"
									>
										{#if O.isSome(maybeExpirationDate)}
											<div class="text-lg font-bold leading-4">
												{format(maybeExpirationDate.value, `d`)}
											</div>
											<div class="text-sm leading-4">
												{format(maybeExpirationDate.value, `LLL`)}
											</div>
										{:else}
											<Inf class="p-2 w-full h-full font-bold " />
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
									{:else if O.isSome(maybeExpirationDate) && maybeExpirationDate.value > viewModel.state.currentTimestamp}
										{@const expiration = maybeExpirationDate.value}
										{@const creation = maybeCreation.value}

										{@const totalDuration = expiration - creation}
										{@const remainingDuration =
											expiration - viewModel.state.currentTimestamp}
										{@const currentProgress = remainingDuration / totalDuration}

										{@const currentProgressOrZero =
											totalDuration < 0 ? 0 : currentProgress}

										{@const color = `color-mix(in srgb, var(--color-secondary) ${(currentProgressOrZero * 100).toString(10)}%, var(--color-primary) ${((1 - currentProgressOrZero) * 100).toString(10)}%)`}

										<div
											style:outline-color={color}
											class="z-0 h-[4px] my-[2px] w-full outline-[1px]"
										>
											<div
												class="bg-primary h-full"
												style:background-color={color}
												style:width={`${(currentProgressOrZero * 100).toString()}%`}
											></div>
										</div>
									{:else if O.isSome(maybeExpirationDate)}
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
									{#if O.isSome(maybeExpirationDate)}
										<div
											class={[
												`text-primary duration-fade absolute text-sm`,
												{
													'text-primary font-bold':
														maybeExpirationDate.value <
														viewModel.state.currentTimestamp,
												},
											]}
										>
											{Utils.formatRemainingTime(
												viewModel.state.currentTimestamp,
												maybeExpirationDate.value,
											)}
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	{#if O.isNone(viewModel.derived.maybeNonEmptySelected)}
		<div
			class="fixed right-[16px] left-[16px]"
			style:bottom={`calc(var(--safe-area-inset-bottom, 0) + 21px)`}
		>
			{#if !viewModel.state.receivedError && O.isNone(viewModel.derived.maybeLoadedProducts)}
				<div
					in:fade={{ duration: 200 }}
					class="font-stylish absolute right-0 bottom-[100px] flex flex-col items-end duration-[fade]"
				>
					<div class="w-full p-[20px] text-center">
						Uh-oh, your fridge is looking a little empty! <br />
						Let’s fill it up!
					</div>
					<div
						style:filter={`invert(16%) sepia(2%) saturate(24%) hue-rotate(336deg) brightness(97%) contrast(53%)`}
						style:background-image={`url("${imgUrl}")`}
						class="relative right-[50px] h-[160px] w-[160px] bg-contain bg-no-repeat"
					></div>
				</div>
			{/if}
			<div
				transition:fade={{ duration: 200 }}
				class="bg-primary z-50 absolute bottom-0 right-0 overflow-hidden text-background shadow-md shadow-on-background/30 flex h-[96px] w-[96px] items-center justify-center rounded-4xl"
			>
				<Ripple
					ontap={() => {
						void goto(`/add-product`)
					}}
				></Ripple>
				<Plus size="36" />
			</div>
		</div>
	{/if}

	{#key O.isSome(viewModel.derived.maybeToastMessage)}
		<div
			in:fade={{
				duration: 300,
				easing: cubicIn,
			}}
			out:fade={{ duration: 100 }}
			style:bottom={O.isNone(viewModel.derived.maybeNonEmptySelected)
				? `calc(var(--safe-area-inset-bottom, 0) + 140px)`
				: `calc(var(--safe-area-inset-bottom, 0) + 21px)`}
			class="z-90 fixed flex left-0 right-0 items-center justify-center transition-all"
		>
			{#if O.isSome(viewModel.derived.maybeToastMessage)}
				<div
					class="flex justify-center items-center px-8 w-full max-w-lg transition-all"
				>
					<div
						id="toast-success"
						class="flex p-4 items-center w-full shadow-md mx-auto text-gray-500 bg-white rounded-lg"
						role="alert"
					>
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
						<div class="ms-3 text-sm font-normal">
							{viewModel.derived.maybeToastMessage.value.message}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/key}
</div>
