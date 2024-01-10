import * as Rx from 'rxjs'

import { R_Transformer } from '@/core/controller'

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

export const addFood: R_Transformer<
	Deps,
	Command,
	Model
> = {
	init: { type: 'loading' } satisfies Model,
	transformer: cmd$ => deps =>
		Rx.of({ type: 'loading' }),
}
