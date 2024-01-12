import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { ViewModel } from '@/core/view-model'

import { AddFood as AddFoodCommand } from '@/app/commands/add-food'

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

interface Deps {
	addFood: AddFoodCommand
}

export const addFood: ViewModel<
	Deps,
	Command,
	Model
> = {
	init: { type: 'loading' } satisfies Model,
	transformer: cmd$ => pipe(cmd$),
}
