import {
	Accessor,
	from,
	useContext,
} from 'solid-js'

import { AppContext } from './context'

function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}

function Overview() {
	const app = useContext(AppContext)!

	const model = withDefault(
		from(app.overview.stream),
		app.overview.init,
	)

	return model.foods.map(food => <div>asd</div>)
}

export default Overview
