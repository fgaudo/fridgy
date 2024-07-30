import {
	type Component,
	For,
	Match,
	Show,
	Switch,
	createEffect,
	createMemo,
	createRenderEffect,
} from 'solid-js'

import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'
import { SnackBar } from '@/ui/widgets/SnackBar'

import { useOverviewStore } from './store'

const Home: Component = () => {
	const [store, dispatch] = useOverviewStore()

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

	return (
		<>
			<div
				class="fixed z-50 transition-all"
				classList={{
					'bottom-[128px] left-[16px] right-[16px]':
						!store.selectMode,
					'bottom-[16px] left-[16px] right-[16px]':
						store.selectMode,
				}}>
				<SnackBar message={store.toastMessage} />
			</div>
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
								<div slot="headline">About</div>
							</md-list-item>
						</md-list>
					</div>
				</div>
			</div>
			<div class="pb-[128px] pt-[64px]">
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
				</SmallTopAppBar>
				<Switch>
					<Match when={store.isLoading}>
						<md-circular-progress
							prop:indeterminate={true}
							class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
						/>
					</Match>
					<Match when={store.products.length > 0}>
						<>
							<p class="px-[14px] pt-[10px] text-xs">
								{store.total} products in your
								fridge
							</p>
							<md-list>
								<For each={store.products}>
									{(productModel, i) => {
										createRenderEffect(() => {
											dispatch({
												type: 'log',
												severity: 'debug',
												message: `Received change for element ${i().toString(10)} \n${JSON.stringify(productModel, null, 2)}`,
											})
										})
										return (
											<>
												<Show when={i() !== 0}>
													<md-divider />
												</Show>

												<md-list-item
													prop:type="button"
													classList={{
														'bg-surface-variant':
															store.selectedProducts.has(
																productModel.id,
															),
													}}
													onClick={e => {
														if (
															!store.selectMode
														) {
															return
														}
														e.preventDefault()
														dispatch({
															type: 'toggleItem',
															id: productModel.id,
														})
													}}
													onContextMenu={e => {
														if (
															store.selectMode
														) {
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

													<div slot="headline">
														{productModel.name}
													</div>
												</md-list-item>
											</>
										)
									}}
								</For>
								<Show
									when={
										store.products.length > 0
									}>
									<md-divider />
								</Show>
							</md-list>
						</>
					</Match>
				</Switch>

				<div
					classList={{
						'opacity-0 pointer-events-none':
							store.products.length > 0,
					}}
					class="fixed bottom-[150px] left-0 right-0 flex flex-col items-end font-titleLarge">
					<div class="w-full p-[20px] text-center">
						Your fridge looks a bit empty. <br />{' '}
						Here’s the button to add some food.
					</div>
					<div class="relative right-[70px] top-[30px] h-[160px] w-[160px] bg-[url(arrow.svg)] bg-contain bg-no-repeat" />
				</div>
				<div
					class="fixed transition-all duration-300"
					classList={{
						'opacity-0 pointer-events-none':
							store.selectMode,
						'bg-transparent bottom-[16px] right-[16px] h-[96px] w-[96px]':
							!store.isOpeningAddProduct,
						'opacity-50':
							store.isScrolling &&
							!store.selectMode,
						'bg-surface h-screen w-screen right-0 bottom-0':
							store.isOpeningAddProduct,
					}}>
					<md-fab
						classList={{
							'opacity-0':
								store.isOpeningAddProduct,
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
			</div>
		</>
	)
}

export default Home
