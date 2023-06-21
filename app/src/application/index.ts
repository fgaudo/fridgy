/* eslint-disable functional/no-expression-statements */
import { Observer, Subscribable, Subscription, Unsubscribable } from 'rxjs'
import { Pipe, PipeNoUnsub } from 'src/core/pipe'

import {
	FoodOverviewCmd,
	FoodOverviewDeps,
	FoodOverviewViewModel,
	foodOverview
} from '@/application/usecase/food-overview'

export type Deps = Readonly<{
	foodOverviewDep: FoodOverviewDeps
}>

export type UseCases = Readonly<{
	foodOverview: PipeNoUnsub<FoodOverviewCmd, FoodOverviewViewModel>
}>

export class App implements Subscribable<UseCases> {
	constructor(private readonly deps: Deps) {}

	subscribe(observer: Partial<Observer<UseCases>>): Unsubscribable {
		const sub = new Subscription()

		const foodOverviewPipe = new Pipe(foodOverview(this.deps.foodOverviewDep))

		sub.add(foodOverviewPipe)
		observer.next?.({ foodOverview: foodOverviewPipe })

		return sub
	}
}
