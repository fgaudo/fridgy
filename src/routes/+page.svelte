<script lang="ts">
	import { goto } from '$app/navigation'
	import { App as CAP } from '@capacitor/app'
	import { Toast } from '@capacitor/toast'
	import QM from '@lucide/svelte/icons/circle-question-mark'
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
	import { expoIn, expoOut } from 'svelte/easing'
	import { SvelteSet } from 'svelte/reactivity'
	import { fade, fly } from 'svelte/transition'

	import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'

	import { useViewmodel } from '$lib/adapters.svelte.ts'
	import imgUrl from '$lib/assets/arrow.svg'
	import Ripple from '$lib/components/ripple.svelte'
	import Spinner from '$lib/components/spinner.svelte'
	import { getGlobalContext } from '$lib/context.ts'
	import * as Utils from '$lib/utils.ts'

	import { Pages } from '../business/index.ts'
	import { Home } from '../business/pages/index.ts'

	const { runtime } = getGlobalContext()

	type State = {
		isMenuOpen: boolean
		selectedProducts: SvelteSet<string>
	}

	const state = $state<State>({
		isMenuOpen: false,
		selectedProducts: new SvelteSet(),
	})

	const viewmodel = useViewmodel({
		runtime,
		makeViewModel: Pages.Home.makeViewModel,
		messages: m => {
			void Toast.show({ text: m })
		},
	})

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

				if (viewmodelState.refreshStatus._tag !== 'Success') {
					return false
				}

				const products = yield* viewmodelState.refreshStatus.maybeProducts

				return Arr.findFirstIndex(
					products,
					product =>
						product._tag !== 'Corrupt' &&
						product._tag !== 'Invalid' &&
						Option.isSome(product.maybeExpiration),
				)
			}),
		),
	)

	$effect(() => {
		if (!refreshTimeListenersEnabled) return

		const handle = CAP.addListener(`resume`, () => {})

		return () => {
			void handle.then(h => h.remove())
		}
	})
</script>

{#snippet corruptProduct()}
	<div
		class="flex mx-2 relative transition-transform shadow-sm rounded-lg py-1 overflow-hidden bg-secondary/5"
	>
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
					<QM class="p-2 w-full h-full font-bold " />
				</div>
			</div>

			<div class="flex-1 h-full flex justify-center flex-col leading-4 gap-2">
				<div>[ CORRUPT ]</div>

				<div>No creation date</div>
			</div>
		</div>
	</div>
{/snippet}

{#if !viewmodel}
	<div
		transition:fade={{ duration: 200 }}
		class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
	>
		<Spinner />
	</div>
{:else}
	{#snippet invalidProduct(
		product: Pages.Home.ProductDTO & { _tag: 'Invalid' },
	)}
		<div
			class={[
				`flex mx-2 relative transition-transform shadow-sm rounded-lg py-1 overflow-hidden`,
				Option.isSome(maybeSelectedProducts) &&
				HashSet.has(maybeSelectedProducts.value, product.id)
					? `bg-accent/10 scale-[102%]`
					: `bg-secondary/5`,
			]}
		>
			{#if !viewmodel.state.isBusy}
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
						<QM class="p-2 w-full h-full font-bold " />
					</div>
				</div>

				<div class="flex-1 h-full flex justify-center flex-col leading-4 gap-2">
					{#if Option.isSome(product.maybeName)}
						<div
							class="overflow-ellipsis whitespace-nowrap overflow-hidden capitalize"
						>
							{product.maybeName.value}
						</div>
					{:else}
						<div>[NO NAME]</div>
					{/if}
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet menu()}
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
	{/snippet}

	<div in:fade>
		{#if state.isMenuOpen}
			{@render menu()}
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
							{#if !viewmodel.state.isBusy}
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
							<Ripple color="var(--color-background)" ontap={toggleMenu}
							></Ripple>
							<Menu />
						</div>
					{/if}
				</div>

				<div class="font-stylish pl-2 text-2xl font-extrabold translate-y-0.5">
					Fridgy
				</div>
				<div class="grow"></div>
				{#if Option.isSome(maybeSelectedProducts)}
					<div
						transition:fade={{ duration: 200 }}
						class="relative flex h-full items-center text-lg font-stylish translate-y-0.5"
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
						{#if !viewmodel.state.isBusy}
							<Ripple
								ontap={() => {
									viewmodel.dispatch(
										Pages.Home.Message.StartDeleteAndRefresh({
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
			{#if viewmodel.state.refreshStatus._tag === 'Success'}
				{@const count = Option.isSome(
					viewmodel.state.refreshStatus.maybeProducts,
				)
					? Arr.length(viewmodel.state.refreshStatus.maybeProducts.value)
					: 0}

				<p
					out:fade={{ duration: 200 }}
					class="bg-background z-50 w-full px-3.5 pt-2.5 pb-2 text-xs"
				>
					{count} items
				</p>
			{/if}
		</div>

		{#if viewmodel.state.isBusy}
			<div
				transition:fade={{ duration: 200 }}
				class="z-50 scale-[175%] fixed left-0 top-0 right-0 bottom-0 backdrop-blur-[1px] flex items-center justify-center"
			>
				<Spinner />
			</div>
		{/if}

		<div class="bg-background flex flex-col">
			{#if viewmodel.state.refreshStatus._tag === 'Error'}
				<div
					class="flex h-screen w-screen items-center justify-center text-center text-lg"
				>
					<div>
						Could not load the list! :(
						<br />
						<div
							class="text-primary underline relative overflow-hidden rounded-full py-1 px-2"
						>
							{#if viewmodel.state.isBusy}
								<Ripple
									ontap={() => {
										viewmodel.dispatch(Pages.Home.Message.StartFetchList())
									}}
								></Ripple>
							{/if}

							Try again
						</div>
					</div>
				</div>
			{:else if viewmodel.state.refreshStatus._tag === 'Uninitialized'}
				<div
					class="flex h-screen w-screen items-center justify-center text-center text-lg"
				>
					<Spinner />
				</div>
			{:else if Option.isSome(viewmodel.state.refreshStatus.maybeProducts)}
				{@const products = viewmodel.state.refreshStatus.maybeProducts.value}

				<div
					style:padding-top={`calc(var(--safe-area-inset-top) + 64px + 42px)`}
					style:padding-bottom={`calc(var(--safe-area-inset-bottom) + 140px)`}
					out:fade={{ duration: 200 }}
					class="flex flex-1 gap-2 flex-col w-full"
				>
					{#each products as product (product.id)}
						<div out:fade={{ duration: 200 }} animate:flip={{ duration: 250 }}>
							{#if product._tag === 'Corrupt'}
								{@render corruptProduct()}
							{:else if product._tag === 'Invalid'}
								{@render invalidProduct(product)}
							{:else}
								<div
									class={[
										`flex mx-2 relative transition-transform shadow-sm rounded-lg py-1 overflow-hidden`,
										Option.isSome(maybeSelectedProducts) &&
										HashSet.has(maybeSelectedProducts.value, product.id)
											? `bg-accent/10 scale-[102%]`
											: `bg-secondary/5`,
									]}
								>
									{#if !viewmodel.state.isBusy}
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
												{#if Option.isSome(product.maybeExpiration)}
													<div class="text-lg font-bold leading-4">
														{format(product.maybeExpiration.value.date, `d`)}
													</div>
													<div class="text-sm leading-4">
														{format(product.maybeExpiration.value.date, `LLL`)}
													</div>
												{:else}
													<Inf class="p-2 w-full h-full font-bold " />
												{/if}
											</div>
										</div>

										<div
											class="flex-1 h-full flex justify-center flex-col leading-4 gap-2"
										>
											<div
												class="overflow-ellipsis whitespace-nowrap overflow-hidden capitalize"
											>
												{product.name}
											</div>

											{#if Option.isSome(product.maybeExpiration) && product.maybeExpiration.value._tag === 'Fresh'}
												{@const freshnessPercentage =
													product.maybeExpiration.value.freshness * 100}
												{@const color = `color-mix(in srgb, var(--color-secondary) ${freshnessPercentage.toString(10)}%, var(--color-primary) ${((1 - freshnessPercentage) * 100).toString(10)}%)`}

												<div
													style:outline-color={color}
													class="z-0 h-1 my-0.5 w-full outline-[1px]"
												>
													<div
														class="bg-primary h-full"
														style:background-color={color}
														style:width={`${freshnessPercentage.toString(10)}%`}
													></div>
												</div>
											{:else}
												<div
													class="text-[12px] leading-2 text-primary font-bold"
												>
													Expired
												</div>
											{/if}
										</div>
										<div
											class="h-9/12 aspect-square flex items-center justify-center"
										>
											{#if Option.isSome(product.maybeExpiration) && product.maybeExpiration.value._tag === 'Fresh'}
												<div
													class={[
														`text-primary duration-fade absolute text-sm`,
													]}
												>
													{Utils.formatRemainingTime(
														product.maybeExpiration.value.timeLeft,
													)}
												</div>
											{:else}
												<div
													class={[
														`text-primary duration-fade absolute text-sm font-bold`,
													]}
												>
													EXP
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div
					class="fixed right-4 left-4"
					style:bottom={`calc(var(--safe-area-inset-bottom, 0) + 21px)`}
				>
					{#if Option.isNone(viewmodel.state.refreshStatus.maybeProducts)}
						<div
							in:fade={{ duration: 200 }}
							class="font-stylish absolute right-0 bottom-[100px] flex flex-col items-end duration-[fade]"
						>
							<div class="w-full p-5 text-center">
								Uh-oh, your fridge is looking a little empty! <br />
								Let’s fill it up!
							</div>
							<div
								style:filter={`invert(16%) sepia(2%) saturate(24%) hue-rotate(336deg) brightness(97%) contrast(53%)`}
								style:background-image={`url("${imgUrl}")`}
								class="relative right-[50px] h-40 w-40 bg-contain bg-no-repeat"
							></div>
						</div>
					{/if}
				</div>
			{/if}

			{#if Option.isNone(maybeSelectedProducts)}
				<div
					class="fixed right-4 left-4"
					style:bottom={`calc(var(--safe-area-inset-bottom, 0) + 21px)`}
				>
					<div
						transition:fade={{ duration: 200 }}
						class="bg-primary z-50 absolute bottom-0 right-0 overflow-hidden text-background shadow-md shadow-on-background/30 flex h-24 w-24 items-center justify-center rounded-4xl"
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
		</div>
	</div>
{/if}
