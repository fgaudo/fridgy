import { useNavigate } from '@solidjs/router'
import {
	For,
	Match,
	Show,
	Switch,
	createRenderEffect,
	createSignal,
	from,
	useContext,
} from 'solid-js'

import { AppContext } from '@/ui/context'
import { createOnWindowScrollListener } from '@/ui/core/helpers'
import { Title } from '@/ui/widgets/Title'
import { TopAppBar } from '@/ui/widgets/TopAppBar'

function Overview() {
	const app = useContext(AppContext)!
	const model = from(app.overview.stream)
	const scroll = createOnWindowScrollListener()
	const navigate = useNavigate()

	const [isOpeningAddFood, setOpeningAddFood] =
		createSignal(false)

	const openAddFoods = () => {
		setOpeningAddFood(true)
		setTimeout(() => {
			navigate('/add-food')
		}, 250)
	}

	const ready = () => {
		const val = model()

		if (val?.type === 'ready') {
			return val
		}
	}
	createRenderEffect(() => {
		if (!model())
			app.log('debug', 'Rendering loading screen')
	})

	return (
		<div class="pb-[128px] pt-[56px]">
			<TopAppBar>
				<div class="ml-[16px]">
					<Title>Overview</Title>
				</div>
				<md-icon-button class="ml-auto mr-[8px]">
					<md-icon>more_vert</md-icon>
				</md-icon-button>
			</TopAppBar>
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
							<For each={onReady().foods}>
								{(foodModel, i) => {
									createRenderEffect(() => {
										app.log(
											'debug',
											`Received change for element ${i()} \n${JSON.stringify(foodModel, null, 2)}`,
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
													{foodModel.name}
												</div>
												<div slot="supporting-text">
													In stock
												</div>
												<div slot="trailing-supporting-text">
													56
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
						!isOpeningAddFood(),
					'opacity-50': scroll().isScrolling,
					'opacity-100': !scroll().isScrolling,
					'bg-[var(--md-sys-color-surface)]  h-screen w-screen right-0 bottom-0':
						isOpeningAddFood(),
				}}>
				<md-fab
					classList={{
						'opacity-0': isOpeningAddFood(),
					}}
					onClick={openAddFoods}
					prop:variant="primary"
					prop:size="large">
					<md-icon slot="icon">add</md-icon>
				</md-fab>
			</div>
		</div>
	)
}

export default Overview
