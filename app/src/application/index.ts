import { Observer, Subscribable, Subscription, Unsubscribable } from 'rxjs'
import { Pipe, PipeNoUnsub } from 'src/core/pipe'

import {
	FoodOverviewCmd,
	FoodOverviewDeps,
	FoodOverviewViewModel,
	foodOverview
} from '@/application/usecase/food-overview'

export type Deps = {
	foodOverviewDep: FoodOverviewDeps
}

export type UseCases = {
	foodOverview: PipeNoUnsub<FoodOverviewCmd, FoodOverviewViewModel>
}

export class App implements Subscribable<UseCases> {
	constructor(deps: Deps) {
		this._deps = deps
	}

	subscribe(observer: Partial<Observer<UseCases>>): Unsubscribable {
		const sub = new Subscription()

		const foodOverviewPipe = new Pipe(foodOverview(this._deps.foodOverviewDep))

		sub.add(foodOverviewPipe)
		observer.next?.({ foodOverview: foodOverviewPipe })

		return sub
	}

	private readonly _deps: Deps
}
