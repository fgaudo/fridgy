import {
	For,
	Match,
	Show,
	Switch,
	createRenderEffect,
	from,
	onCleanup,
	useContext,
} from 'solid-js'

import { AppContext } from '@/ui/context'
import { withDefault } from '@/ui/core/solid-js'
import { Title } from '@/ui/widgets/Title'
import { TopAppBar } from '@/ui/widgets/TopAppBar'

function Overview() {
	const app = useContext(AppContext)!
	const model = withDefault(
		from(app.overview.stream),
		app.overview.init,
	)

	const ready = () => {
		const val = model()

		if (val.type === 'ready') {
			return val
		}
	}

	const loading = () => {
		const val = model()
		if (val.type === 'loading') {
			return val
		}
	}
	return (
		<Switch>
			<Match when={ready()}>
				{onReady => {
					createRenderEffect(() => {
						app.log(
							'debug',
							`Ready model received with ${onReady().foods.length} food elements`,
						)
					})
					onCleanup(() => {
						console.log('ciao')
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

							<md-fab
								prop:variant="primary"
								class="fixed bottom-[16px] right-[16px]"
								prop:size="large">
								<md-icon slot="icon">add</md-icon>
							</md-fab>
						</div>
					)
				}}
			</Match>
			<Match when={loading()}>
				{_onLoading => {
					app.log(
						'debug',
						'Rendering loading screen',
					)
					return <div>loading</div>
				}}
			</Match>
		</Switch>
	)
}

export default Overview
