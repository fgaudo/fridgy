import { function as F } from 'fp-ts'
import {
	type Component,
	For,
	Match,
	Show,
	Switch,
	createRenderEffect,
} from 'solid-js'

import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

import { createOverviewStore } from './store'

const Overview: Component = () => {
	const [store, dispatch] = createOverviewStore()

	return (
		<div class="pb-[128px] pt-[56px]">
			<SmallTopAppBar>
				<div class="font-titleLarge text-titleLarge leading-titleLarge">
					Overview
				</div>
				<md-icon-button class="ml-auto mr-[-8px]">
					<md-icon>more_vert</md-icon>
				</md-icon-button>
			</SmallTopAppBar>
			<Switch
				fallback={
					<md-circular-progress
						prop:indeterminate={true}
						class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
					/>
				}>
				<Match when={store.isReady}>
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
											onContextMenu={e => {
												e.preventDefault()
												dispatch({
													type: 'toggleSelectMode',
												})
											}}>
											<md-icon slot="start">
												ac_unit
											</md-icon>

											<div slot="headline">
												{productModel.name}
											</div>
										</md-list-item>
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
					'bg-transparent bottom-[16px] right-[16px] h-[96px] w-[96px]':
						!store.isOpeningAddProduct,
					'opacity-50': store.isScrolling,
					'opacity-100': !store.isScrolling,
					'bg-surface h-screen w-screen right-0 bottom-0':
						store.isOpeningAddProduct,
				}}>
				<md-fab
					classList={{
						'opacity-0':
							store.isOpeningAddProduct,
					}}
					onClick={() => {
						dispatch({
							type: 'openAddProduct',
						})
					}}
					prop:variant="primary"
					prop:size="large">
					<md-icon slot="icon">add</md-icon>
				</md-fab>
			</div>
		</div>
	)
}

export default Overview
