import {
	For,
	Match,
	Switch,
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
								<LeadingIcon>
									arrow_back
								</LeadingIcon>
								<Title>Fridgy</Title>
								<LeadingIcon>
									more_vert
								</LeadingIcon>
							</TopAppBar>

							<For each={onReady().foods}>
								{f => (
									<md-list>
										<md-list-item>
											<div class="flex items-center justify-between">
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full"
													style={{
														'background-color':
															'var(--md-sys-color-tertiary-container)',
														color:
															'var(--md-sys-color-tertiary-on-container)',
													}}>
													<md-icon slot="icon">
														add
													</md-icon>
												</div>
												<div>{f.name}</div>
											</div>
										</md-list-item>
									</md-list>
								)}
							</For>

							<BottomAppBar>
								<md-icon-button>
									<md-icon>search</md-icon>
								</md-icon-button>

								<md-fab
									prop:variant="primary"
									class="ml-auto"
									prop:size="medium">
									<md-icon slot="icon">
										add
									</md-icon>
								</md-fab>
							</BottomAppBar>
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
