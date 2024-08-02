import {
	type Component,
	For,
	Show,
	createEffect,
	createMemo,
	createRenderEffect,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { Portal } from 'solid-js/web'

import imgUrl from '@/ui/assets/arrow.svg'
import * as H from '@/ui/core/helpers'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'
import { SnackBar } from '@/ui/widgets/SnackBar'

import { useOverviewStore } from './store'

interface UiStore {
	isOpeningAddProduct: boolean
	isScrolling: boolean
	scrollY: number
}

const Home: Component = () => {
	const [store, dispatch] = useOverviewStore()
	const [uiStore, setUiStore] =
		createStore<UiStore>({
			isOpeningAddProduct: false,
			isScrolling: false,
			scrollY: window.scrollY,
		})

	createEffect(() => {
		if (store.isMenuOpen)
			document.body.style.overflow = 'hidden'
		else document.body.style.overflow = 'auto'
	})

	const size = createMemo<number>(prev => {
		return store.selectMode
			? store.selectedProducts.size
			: (prev ?? 0)
	})

	const scroll = H.useWindowScroll()

	createEffect(() => {
		setUiStore(store => ({
			...store,
			isScrolling: scroll().isScrolling,
			scrollY: scroll().scrollY,
		}))
	})

	/* const [store2, setStore2] = createStore<{
		array: {
			id: string
			name: string
		}[]
	}>({ array: [] })

	let i = 0
	const array: {
		id: string
		name: string
	}[] = []
	setInterval(() => {
		++i
		const asd = {
			id: i.toString(10),
			name: i.toString(10),
		}
		array.push(asd)
		setStore2(s => ({
			array: reconcile(array)(s.array),
		}))
	}, 3000) */

	return (
		<>
			<Portal>
				<div>
					<div
						class="fixed bottom-0 left-0 right-0 top-0 z-50 h-full w-full overflow-auto transition-all"
						classList={{
							'bg-[#00000076]': store.isMenuOpen,
							'pointer-events-none':
								!store.isMenuOpen,
						}}
						onClick={() => {
							dispatch({ type: 'toggleMenu' })
						}}>
						<div
							onClick={e => {
								e.stopPropagation()
							}}
							classList={{
								'w-9/12': store.isMenuOpen,
								'w-0': !store.isMenuOpen,
							}}
							class="z-49 relative bottom-0 left-0 top-0 box-border h-full flex-1 overflow-hidden bg-surface transition-all">
							<div class="pl-2 pr-2 pt-8">
								<p class="pb-4 pl-4 font-titleLarge text-titleLarge leading-titleLarge">
									Fridgy
								</p>
								<md-list>
									<md-list-item prop:type="button">
										<md-icon slot="start">
											info
										</md-icon>
										<div slot="headline">
											About
										</div>
									</md-list-item>
								</md-list>
							</div>
						</div>
					</div>
					<SmallTopAppBar>
						<div class="relative h-full w-full">
							<div
								class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all duration-300"
								classList={{
									'opacity-0 pointer-events-none':
										store.selectMode,
								}}>
								<md-icon-button
									class="ml-[-8px] shrink-0"
									onClick={() => {
										dispatch({
											type: 'toggleMenu',
										})
									}}>
									<md-icon>menu</md-icon>
								</md-icon-button>
								<div class="font-titleLarge text-titleLarge leading-titleLarge">
									Home
								</div>
							</div>
							<div
								class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all duration-300"
								classList={{
									'opacity-0 pointer-events-none':
										!store.selectMode,
								}}>
								<md-icon-button
									class="ml-[-8px] shrink-0"
									onClick={() => {
										dispatch({
											type: 'disableSelectMode',
										})
									}}>
									<md-icon>close</md-icon>
								</md-icon-button>

								{size()}

								<md-icon-button
									class="ml-auto mr-[-8px] shrink-0"
									onClick={() => {
										dispatch({
											type: 'deleteProducts',
										})
									}}>
									<md-icon>delete</md-icon>
								</md-icon-button>
							</div>
						</div>
						<div
							classList={{
								'opacity-0 pointer-events-none':
									store.products.length > 0 ||
									store.isLoading,
							}}
							class="fixed bottom-[150px] left-0 right-0 flex flex-col items-end font-titleLarge">
							<div class="w-full p-[20px] text-center">
								Your fridge looks a bit empty.{' '}
								<br />
								Here’s the button to add some
								food.
							</div>
							<div
								style={{
									'background-image': `url("${imgUrl}")`,
								}}
								class={`relative right-[70px] top-[30px] h-[160px] w-[160px] bg-contain bg-no-repeat`}
							/>
						</div>
						<div
							class="fixed transition-all duration-300"
							classList={{
								'opacity-0 pointer-events-none':
									store.selectMode,
								'bg-transparent bottom-[16px] right-[16px] h-[96px] w-[96px]':
									!uiStore.isOpeningAddProduct,
								'opacity-50':
									uiStore.isScrolling &&
									!store.selectMode,
								'bg-surface h-screen w-screen right-0 bottom-0':
									uiStore.isOpeningAddProduct,
							}}>
							<md-fab
								classList={{
									'opacity-0':
										uiStore.isOpeningAddProduct,
								}}
								onClick={() => {
									if (!store.selectMode) {
										dispatch({
											type: 'openAddProduct',
										})
									}
								}}
								prop:variant="primary"
								prop:size="large">
								<md-icon slot="icon">add</md-icon>
							</md-fab>
						</div>
					</SmallTopAppBar>
					<div
						class="fixed z-50 transition-all"
						classList={{
							'bottom-[128px] left-[16px] right-[16px]':
								!store.selectMode,
							'bottom-[16px] left-[16px] right-[16px]':
								store.selectMode,
						}}>
						<SnackBar
							message={store.toastMessage}
						/>
					</div>
				</div>
			</Portal>
			<div class="pb-[128px] pt-[64px]">
				<p class="px-[14px] pt-[10px] text-xs">
					{store.total} items
				</p>
				<md-list>
					<For each={store.products}>
						{(productModel, i) => {
							createRenderEffect(() => {
								dispatch({
									type: 'log',
									severity: 'debug',
									message: `Received change for element ${i().toString(10)} ${JSON.stringify(productModel)}`,
								})
							})
							return (
								<div
									class="absolute transition-all duration-300"
									style={{
										top: `${(i() * 73 + 9).toString(10)}px`,
										left: 0,
										right: 0,
									}}>
									<md-list-item
										prop:type="button"
										classList={{
											'bg-surface-variant':
												store.selectedProducts.has(
													productModel.id,
												),
										}}
										onClick={e => {
											if (!store.selectMode) {
												return
											}
											e.preventDefault()
											dispatch({
												type: 'toggleItem',
												id: productModel.id,
											})
										}}
										onContextMenu={e => {
											if (store.selectMode) {
												return
											}
											e.preventDefault()
											dispatch({
												type: 'toggleItem',
												id: productModel.id,
											})
										}}>
										<md-icon slot="start">
											ac_unit
										</md-icon>

										<div
											classList={{
												'opacity-0':
													!store.selectMode,
											}}
											slot="end"
											class="relative flex h-[24px] w-[24px] items-center justify-center transition-all duration-300">
											<md-icon
												classList={{
													'opacity-0':
														store.selectedProducts.has(
															productModel.id,
														),
												}}
												class="absolute text-primary transition-all duration-300">
												check_box_outline_blank
											</md-icon>
											<md-icon
												classList={{
													'opacity-0':
														!store.selectedProducts.has(
															productModel.id,
														),
												}}
												style={{
													'font-variation-settings':
														"'FILL' 1",
												}}
												class="absolute text-primary transition-all duration-300">
												check_box
											</md-icon>
										</div>

										<div
											slot="headline"
											class="capitalize">
											{productModel.name}
										</div>
										<div slot="supporting-text">
											<div />
										</div>
									</md-list-item>
									<md-divider />
								</div>
							)
						}}
					</For>
				</md-list>
			</div>
		</>
	)
}

export default Home
