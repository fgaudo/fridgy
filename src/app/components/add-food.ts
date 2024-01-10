import * as Rx from 'rxjs'

import { R_Transformer } from '@/core/transformer'

interface FoodData {
	readonly name: string
}

export type Command = Readonly<{
	type: 'add'
	food: FoodData
}>

export type Model = Readonly<
	| { type: 'loading' }
	| {
			type: 'ready'
			model: {
				readonly name: string
			}
	  }
>

interface Deps {}

export interface AddFood {
	readonly transformer: R_Transformer<
		Deps,
		Command,
		Model
	>
	readonly init: Model
}

export const addFood: AddFood = {
	init: { type: 'loading' } satisfies Model,
	transformer: cmd$ => deps =>
		Rx.of({ type: 'loading' }),
}
