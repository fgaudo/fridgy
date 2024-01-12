import { from, useContext } from 'solid-js'

import { withDefault } from '@/ui/core/solid-js'

import { AppContext } from './context'

function Overview() {
	const app = useContext(AppContext)!

	const model = withDefault(
		from(app.overview.stream),
		app.overview.init,
	)

	return model.foods.map(food => <div>asd</div>)
}

export default Overview
