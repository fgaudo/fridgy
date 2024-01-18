import * as R from 'fp-ts/Reader'
import * as T from 'fp-ts/Task'
import { flip, flow, pipe } from 'fp-ts/function'
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
	| {
			type: 'ready'
			model: {
				readonly name: string
			}
	  }
	| { type: 'adding' }
>

export type Init = Readonly<{ type: 'init' }>

interface Deps {
	readonly addFood: AddFoodCommand
}

export const viewModel: ViewModel<
	Deps,
	Command,
	Model,
	Init
> = {
	init: { type: 'init' },
	transformer: flow(
		R.of,
		R.chain(
			flip((deps: Deps) =>
				Rx.exhaustMap(cmd =>
					pipe(
						deps.addFood(cmd.food),
						T.map(
							() =>
								({
									type: 'ready',
									model: cmd.food,
								}) satisfies Model,
						),
						Rx.defer,
						Rx.startWith({
							type: 'adding',
						} satisfies Model),
					),
				),
			),
		),
	),
}
