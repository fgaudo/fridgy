import { useWindowScrollPosition } from '@solid-primitives/scroll'
import {
	For,
	Match,
	Show,
	Switch,
	createEffect,
	createSignal,
	from,
	useContext,
} from 'solid-js'

import { AppContext } from '@/ui/context'
import { withDefault } from '@/ui/core/solid-js'
import { BottomAppBar } from '@/ui/widgets/BottomAppBar'
import { LeadingIcon } from '@/ui/widgets/LeadingIcon'
import { Title } from '@/ui/widgets/Title'
import { TopAppBar } from '@/ui/widgets/TopAppBar'

function Overview() {
	const app = useContext(AppContext)!
	const model = withDefault(
		from(app.overview.stream),
		app.overview.init,
	)

	const [visible, setVisible] = createSignal(true)

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
		<Switch fallback={<div>asd</div>}>
			<Match when={ready()}>
				{onReady => {
					app.log(
						'debug',
						`Rendering entire array with ${onReady().foods.length} food elements`,
					)
					return (
						<div class="pb-20 pt-14">
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
									{(f, i) => (
										<>
											<md-list-item>
												<md-icon slot="start">
													ac_unit
												</md-icon>

												<div slot="headline">
													{f.name}
												</div>
												<div slot="supporting-text">
													In stock
												</div>
												<div slot="trailing-supporting-text">
													56
												</div>
											</md-list-item>
											<Show
												when={
													onReady().foods.length -
														1 !==
													i()
												}>
												<md-divider />
											</Show>
										</>
									)}
								</For>
							</md-list>
							<md-fab
								prop:variant="primary"
								class="fixed bottom-[16px] right-[16px]"
								prop:size="medium">
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
