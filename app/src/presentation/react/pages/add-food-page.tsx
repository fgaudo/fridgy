import * as RoR from 'fp-ts/ReadonlyRecord'
import { useState } from 'react'

import { Title } from '@/presentation/react/ui/title'
import { Transition } from '@/presentation/react/ui/transition'

interface FoodElementState {
	readonly name: string
	readonly id: string
	readonly selected: boolean
	readonly removed: boolean
}

interface FoodsPageState {
	readonly loading: boolean
	readonly selected: ReadonlySet<string>
	readonly foods: RoR.ReadonlyRecord<string, FoodElementState>
}

const init: FoodsPageState = {
	loading: true,
	selected: new Set(),
	foods: {}
}

export function AddFoodPage(): JSX.Element {
	const [state] = useState<FoodsPageState>(init)

	return (
		<Transition loading={state.loading}>
			<Title text="Add food" />
		</Transition>
	)
}
