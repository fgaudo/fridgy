import * as R from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { map } from 'rxjs'

import { CloseableController } from '@/core/controller'

import { Food } from '@/domain/food'

import { DeleteFoodsByIds } from '../commands/delete-foods-by-ids'
import { Foods, toFoodEntity } from '../commands/foods'
import { Log } from '../commands/log'

interface Deps {
	readonly deleteFoodsByIds: DeleteFoodsByIds
	readonly foods: Foods
	readonly log: Log
}

export interface OverviewModel {
	readonly foods: Food[]
}

export type Command = Readonly<{ type: 'delete' } | { type: 'refresh' }>

export type OverviewController = CloseableController<Command, OverviewModel>

export const overview: R.Reader<Deps, OverviewController> = flow(
	R.asks(deps => deps.foods),
	foods =>
		new CloseableController(() =>
			pipe(
				foods,
				map(data => ({ foods: toFoodEntity(data) }))
			)
		)
)
