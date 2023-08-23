/* eslint-disable @typescript-eslint/no-empty-interface */

/* eslint-disable functional/no-throw-statements */

/* eslint-disable @typescript-eslint/no-empty-function */

/* eslint-disable functional/no-return-void */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable functional/prefer-immutable-types */

/* eslint-disable functional/no-this-expressions */

/* eslint-disable functional/no-classes */

/* eslint-disable functional/no-expression-statements */
import * as O from 'fp-ts-rxjs/Observable'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'
import { Pipe, PipeNoUnsub } from 'src/core/pipe'

import {
	FoodOverviewCmd,
	FoodOverviewDeps,
	FoodOverviewReturn,
	FoodOverviewViewModel,
	foodOverview
} from '@/application/usecases/food-overview'

export type Deps = Readonly<{
	foodOverviewDep: FoodOverviewDeps
}>

export type UseCases = Readonly<{
	foodOverview: PipeNoUnsub<FoodOverviewCmd, FoodOverviewReturn>
}>

export class App {
	constructor(private readonly deps: Deps) {}

	subscribe(next: (f: UseCases) => void): Rx.Unsubscribable {
		const sub = new Rx.Subscription()

		const foodOverviewPipe = new Pipe(
			(cmd$: Rx.Observable<FoodOverviewCmd>) => {
				const { left: logs, right: events } = O.separate(
					foodOverview(cmd$)(this.deps.foodOverviewDep)
				)
				return events
			}
		)

		sub.add(foodOverviewPipe)

		next({ foodOverview: foodOverviewPipe })

		return sub
	}
}
