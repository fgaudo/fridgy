import {
	For,
	Match,
	Switch,
	createMemo,
	from,
	useContext,
} from 'solid-js'

import { Model } from '@/app/view-models/overview'

import { tidy } from '@/data/commands/log'

import { AppContext } from '@/ui/context'
import { withDefault } from '@/ui/core/solid-js'

// THIS IS A GUARD FUNCTION.
// It just serves as a reminder to modify the UI when the model changes.
const __guard: (m: Model<string>) =>
	| {
			type: 'ready'
			foods: readonly {
				id: string
				name: string
				deleting: boolean
			}[]
	  }
	| {
			type: 'loading'
	  } = model => model

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
						<For each={onReady().foods}>
							{food => {
								app.log(
									'debug',
									`Rendering food \n${tidy(food)}`,
								)
								return <div>{food.name}</div>
							}}
						</For>
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
