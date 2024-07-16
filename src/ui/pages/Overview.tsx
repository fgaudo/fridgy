import { useNavigate } from '@solidjs/router'
import { function as F } from 'fp-ts'
import * as Rx from 'rxjs'
import {
	type Component,
	For,
	Match,
	Show,
	Switch,
	createRenderEffect,
	createSignal,
	from,
} from 'solid-js'

import type { OverviewController } from '@/data'

import { useWindowScroll } from '@/ui/core/helpers'
import { useDispatcher } from '@/ui/core/solid-js'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Command = { type: 'openAddProduct' }

const flow = F.flow

const Overview =
	(controller: OverviewController): Component =>
	() => {
		const model = from(controller.stream)
		const scroll = useWindowScroll()
		const navigate = useNavigate()

		const [
			isOpeningAddProduct,
			setOpeningAddProduct,
		] = createSignal(false)

		const dispatch = useDispatcher<Command>(
			flow(
				Rx.observeOn(Rx.asyncScheduler),
				Rx.filter(() => {
					if (isOpeningAddProduct()) return false
					setOpeningAddProduct(true)
					return true
				}),
				Rx.tap(cmd => {
					console.debug(
						`Dispatched '${cmd.type}' command`,
					)
				}),
				Rx.delay(250),
				Rx.tap(() => {
					navigate('/add-product')
				}),
				Rx.ignoreElements(),
			),
		)

		const ready = () => {
			const val = model()

			if (val?.type === 'ready') {
				return val
			}
		}

		createRenderEffect(() => {
			if (!model()) {
				console.debug('Rendering loading screen')
			}
		})

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
					<Match when={ready()}>
						{onReady => (
							<md-list>
								<For each={onReady().products}>
									{(productModel, i) => {
										createRenderEffect(() => {
											console.debug(
												`Received change for element ${i().toString(10)} \n${JSON.stringify(productModel, null, 2)}`,
											)
										})
										return (
											<>
												<Show when={i() !== 0}>
													<md-divider />
												</Show>
												<md-list-item prop:type="button">
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
							</md-list>
						)}
					</Match>
				</Switch>

				<div
					class="fixed transition-all duration-[0.25s]"
					classList={{
						'bg-transparent bottom-[16px] right-[16px] h-[96px] w-[96px]':
							!isOpeningAddProduct(),
						'opacity-50': scroll().isScrolling,
						'opacity-100': !scroll().isScrolling,
						'bg-surface h-screen w-screen right-0 bottom-0':
							isOpeningAddProduct(),
					}}>
					<md-fab
						classList={{
							'opacity-0': isOpeningAddProduct(),
						}}
						onClick={() => {
							if (!isOpeningAddProduct())
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
