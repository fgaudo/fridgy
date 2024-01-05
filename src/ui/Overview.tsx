import { useObservableState } from 'observable-hooks'
import { useContext } from 'react'

import { AppContext } from './context'

function Overview() {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const overview =
		useContext(AppContext)!.overview
	const model = useObservableState(
		overview.stream,
		overview.init,
	)

	if (model.type === 'loading') {
		return <div>Loading</div>
	}

	return (
		<div>
			{model.foods.map(food => (
				<div key={food.id}>{food.name}</div>
			))}
		</div>
	)
}

export default Overview
