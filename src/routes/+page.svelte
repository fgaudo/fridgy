<script lang="ts">
	import { goto } from '$app/navigation'
	import { App as CAP } from '@capacitor/app'
	import Inf from '@lucide/svelte/icons/infinity'
	import Info from '@lucide/svelte/icons/info'
	import Menu from '@lucide/svelte/icons/menu'
	import Plus from '@lucide/svelte/icons/plus'
	import Trash2 from '@lucide/svelte/icons/trash-2'
	import X from '@lucide/svelte/icons/x'
	import { format } from 'date-fns'
	import * as Arr from 'effect/Array'
	import { pipe } from 'effect/Function'
	import * as HashSet from 'effect/HashSet'
	import * as Option from 'effect/Option'
	import { flip } from 'svelte/animate'
	import { cubicIn, expoIn, expoOut } from 'svelte/easing'
	import { SvelteSet } from 'svelte/reactivity'
	import { fade, fly } from 'svelte/transition'

	import * as Integer from '@/core/integer/index.ts'
	import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'

	import { useViewmodel } from '$lib/adapters.svelte.ts'
	import imgUrl from '$lib/assets/arrow.svg'
	import Ripple from '$lib/components/ripple.svelte'
	import Spinner from '$lib/components/spinner.svelte'
	import { getGlobalContext } from '$lib/context.ts'
	import * as Utils from '$lib/utils.ts'

	import { capacitor } from '../business/feature/home/index.ts'
	import { Message } from './(viewmodel)/update.ts'

	const { executor } = getGlobalContext()

	type State = {
		currentTimestamp: Integer.Integer
		isMenuOpen: boolean
		selectedProducts: SvelteSet<string>
	}

	const state = $state<State>({
		isMenuOpen: false,
		currentTimestamp: Integer.unsafeFromNumber(Date.now()),
		selectedProducts: new SvelteSet(),
	})

	const viewmodel = useViewmodel(executor, capacitor)

	function toggleMenu() {
		if (state.isMenuOpen) {
			state.isMenuOpen = false
			return
		}

		state.isMenuOpen = true
	}

	function toggleItem(id: string | symbol) {
		if (typeof id === `symbol`) {
			return
		}

		if (state.selectedProducts.has(id)) {
			state.selectedProducts.delete(id)
			return
		}

		state.selectedProducts.add(id)
	}

	function clearSelected() {
		state.selectedProducts.clear()
	}

	const maybeSelectedProducts = $derived(
		pipe(
			state.selectedProducts,
			HashSet.fromIterable,
			NonEmptyHashSet.fromHashSet,
		),
	)

	const refreshTimeListenersEnabled = $derived(
		Option.isSome(
			Option.gen(function* () {
				const { state: viewmodelState } = yield* Option.fromNullable(viewmodel)
				const products = yield* viewmodelState.maybeProducts
				return Arr.findFirstIndex(
					products,
					e => !e.isCorrupt && Option.isSome(e.maybeExpirationDate),
				)
			}),
		),
	)

	$effect(() => {
		if (!refreshTimeListenersEnabled) return

		const handle = CAP.addListener(`resume`, () => {
			state.currentTimestamp = Integer.unsafeFromNumber(Date.now())
		})

		const interval = setInterval(() => {
			state.currentTimestamp = Integer.unsafeFromNumber(Date.now())
		}, 20000)

		return () => {
			void handle.then(h => h.remove())
			clearInterval(interval)
		}
	})
</script>

<div in:fade>
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
			onpointerup={toggleMenu}
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
				{#if Option.isSome(maybeSelectedProducts)}
					<div class="absolute" transition:fade={{ duration: 200 }}>
						{#if !viewmodelState.isDeleteRunning}
							<Ripple
								ontap={() => {
									clearSelected()
								}}
							></Ripple>
						{/if}

						<X />
					</div>
				{:else}
					<div transition:fade={{ duration: 200 }} class="absolute">
						<Ripple color="var(--color-background)" ontap={toggleMenu}></Ripple>
						<Menu />
					</div>
				{/if}
			</div>

			<div class="font-stylish pl-2 text-2xl font-extrabold translate-y-[2px]">
				Fridgy
			</div>
			<div class="grow"></div>
			{#if Option.isSome(maybeSelectedProducts)}
				<div
					transition:fade={{ duration: 200 }}
					class="relative flex h-full items-center text-lg font-stylish translate-y-[2px]"
				>
					{#key HashSet.size(maybeSelectedProducts.value)}
						<div class="absolute" transition:fade={{ duration: 200 }}>
							{HashSet.size(maybeSelectedProducts.value)}
						</div>
					{/key}
				</div>

				<div
					class="ml-2 mr-2 relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden"
					transition:fade={{ duration: 200 }}
				>
					{#if !viewmodelState.isDeleteRunning && dispatch}
						<Ripple
							ontap={() => {
								dispatch(
									Message.DeleteAndRefresh({
										ids: maybeSelectedProducts.value,
									}),
								)
							}}
						></Ripple>
					{/if}
					<Trash2 />
				</div>
			{/if}
		</div>
		{#if Option.isSome(viewmodelState.maybeProducts)}
			{@const products = viewmodelState.maybeProducts.value}

			<p
				out:fade={{ duration: 200 }}
				class="bg-background z-50 w-full px-[14px] pt-[10px] pb-[8px] text-xs"
			>
				{Arr.length(products)} items
			</p>
		{/if}
	</div>
	{#if viewmodelState.isLoading}
		<div
			transition:fade={{ duration: 200 }}
			class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
		>
			<Spinner />
		</div>
	{/if}

	<div class="bg-background flex flex-col">
		{#if viewmodelState.receivedError}
			<div
				class="flex h-screen w-screen items-center justify-center text-center text-lg"
			>
				<div>
					Could not load the list! :(
					<br />
					<div
						class="text-primary underline relative overflow-hidden rounded-full py-1 px-2"
					>
						{#if dispatch}
							<Ripple
								ontap={() => {
									dispatch(Message.FetchList())
								}}
							></Ripple>
						{/if}

						Try again
					</div>
				</div>
			</div>
		{:else if Option.isSome(viewmodelState.maybeProducts)}
			{@const products = viewmodelState.maybeProducts.value}

			<div
				style:padding-top={`calc(var(--safe-area-inset-top) + 64px + 42px)`}
				style:padding-bottom={`calc(var(--safe-area-inset-bottom) + 140px)`}
				out:fade={{ duration: 200 }}
				class="flex flex-1 gap-2 flex-col w-full"
			>
				{#each products as product (product.id)}
					{@const maybeCreation = product.isCorrupt
						? Option.none<number>()
						: product.isValid
							? Option.some(product.creationDate)
							: product.maybeCreationDate}

					{@const maybeName = product.isCorrupt
						? product.maybeName
						: product.isValid
							? Option.some(product.name)
							: product.maybeName}

					{@const maybeExpirationDate = product.isCorrupt
						? Option.none<number>()
						: product.maybeExpirationDate}
					<div out:fade={{ duration: 200 }} animate:flip={{ duration: 250 }}>
						<div
							class={[
								`flex mx-2 relative transition-transform shadow-sm rounded-lg py-1 overflow-hidden`,
								!product.isCorrupt &&
								Option.isSome(maybeSelectedProducts) &&
								HashSet.has(maybeSelectedProducts.value, product.id)
									? `bg-accent/10 scale-[102%]`
									: `bg-secondary/5`,
							]}
						>
							{#if !viewmodelState.isDeleteRunning}
								{#if Option.some(maybeSelectedProducts)}
									<Ripple
										ontap={() => {
											toggleItem(product.id)
										}}
									></Ripple>
								{:else}
									<Ripple
										onhold={() => {
											toggleItem(product.id)
										}}
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
										{#if Option.isSome(maybeExpirationDate)}
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
									{#if Option.isSome(maybeName)}
										<div
											class="overflow-ellipsis whitespace-nowrap overflow-hidden capitalize"
										>
											{maybeName.value}
										</div>
									{:else}
										<div>[NO NAME]</div>
									{/if}

									{#if Option.isNone(maybeCreation)}
										No creation date
									{:else if Option.isSome(maybeExpirationDate) && maybeExpirationDate.value > state.currentTimestamp}
										{@const expiration = maybeExpirationDate.value}
										{@const creation = maybeCreation.value}

										{@const totalDuration = expiration - creation}
										{@const remainingDuration =
											expiration - state.currentTimestamp}
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
									{:else if Option.isSome(maybeExpirationDate)}
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
									{#if Option.isSome(maybeExpirationDate)}
										<div
											class={[
												`text-primary duration-fade absolute text-sm`,
												{
													'text-primary font-bold':
														maybeExpirationDate.value < state.currentTimestamp,
												},
											]}
										>
											{Utils.formatRemainingTime(
												state.currentTimestamp,
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
	{#if Option.isNone(maybeSelectedProducts)}
		<div
			class="fixed right-[16px] left-[16px]"
			style:bottom={`calc(var(--safe-area-inset-bottom, 0) + 21px)`}
		>
			{#if !viewmodelState.receivedError && Option.isNone(viewmodelState.maybeProducts)}
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

	{#key Option.isSome(viewmodelState.maybeMessage)}
		<div
			in:fade={{
				duration: 300,
				easing: cubicIn,
			}}
			out:fade={{ duration: 100 }}
			style:bottom={Option.isNone(maybeSelectedProducts)
				? `calc(var(--safe-area-inset-bottom, 0) + 140px)`
				: `calc(var(--safe-area-inset-bottom, 0) + 21px)`}
			class="z-90 fixed flex left-0 right-0 items-center justify-center transition-all"
		>
			{#if Option.isSome(viewmodelState.maybeMessage)}
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
							{viewmodelState.maybeMessage.value}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/key}
</div>
