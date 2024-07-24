import {
	type Component,
	For,
	Match,
	Show,
	Switch,
	createEffect,
	createRenderEffect,
} from 'solid-js'

import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

import { useOverviewStore } from './store'

const Overview: Component = () => {
	const [store, dispatch] = useOverviewStore()

	createEffect(() => {
		if (store.isMenuOpen)
			document.body.style.overflow = 'hidden'
		else document.body.style.overflow = 'auto'
	})

	return (
		<>
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
			<div class="pb-[128px] pt-[56px]">
				<SmallTopAppBar>
					<Show
						when={store.selectMode}
						fallback={
							<>
								<md-icon-button
									class="pr-[8px]"
									onClick={() => {
										dispatch({
											type: 'toggleMenu',
										})
									}}>
									<md-icon>menu</md-icon>
								</md-icon-button>
								<div class="font-titleLarge text-titleLarge leading-titleLarge">
									Overview
								</div>
							</>
						}>
						<md-icon-button
							class="pr-[8px]"
							onClick={() => {
								dispatch({
									type: 'disableSelectMode',
								})
							}}>
							<md-icon>close</md-icon>
						</md-icon-button>
						{store.selectedProducts.size}
						<Show when={store.selectMode}>
							<md-icon-button
								class="ml-auto mr-[-8px]"
								onClick={() => {
									dispatch({
										type: 'deleteProducts',
									})
								}}>
								<md-icon>delete</md-icon>
							</md-icon-button>
						</Show>
					</Show>
				</SmallTopAppBar>
				<Switch>
					<Match when={store.isLoading}>
						<md-circular-progress
							prop:indeterminate={true}
							class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
						/>
					</Match>
					<Match when={store.products.length > 0}>
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
											<Show
												when={store.selectMode}
												fallback={
													<md-list-item
														prop:type="button"
														onContextMenu={e => {
															e.preventDefault()
															dispatch({
																type: 'toggleItem',
																id: productModel.id,
															})
														}}>
														<md-icon slot="start">
															ac_unit
														</md-icon>

														<div slot="headline">
															{productModel.name}
														</div>
													</md-list-item>
												}>
												<md-list-item
													classList={{
														'bg-surface-container':
															store.selectedProducts.has(
																productModel.id,
															),
													}}
													prop:type="button"
													onClick={e => {
														e.preventDefault()
														dispatch({
															type: 'toggleItem',
															id: productModel.id,
														})
													}}>
													<md-icon slot="start">
														ac_unit
													</md-icon>

													<div slot="headline">
														{productModel.name}
													</div>
												</md-list-item>
											</Show>
										</>
									)
								}}
							</For>
							<Show
								when={store.products.length > 0}>
								<md-divider />
							</Show>
						</md-list>
					</Match>
				</Switch>

				<div
					class="fixed transition-all duration-[0.25s]"
					classList={{
						'opacity-0 pointer-events-none':
							store.selectMode,
						'bg-transparent bottom-[16px] right-[16px] h-[96px] w-[96px]':
							!store.isOpeningAddProduct,
						'opacity-50':
							store.isScrolling &&
							!store.selectMode,
						'opacity-100':
							!store.isScrolling &&
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

export default Overview
