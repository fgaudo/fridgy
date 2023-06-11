import { liveQuery } from 'dexie'
import * as OBS from 'fp-ts-rxjs/Observable'
import * as OBSE from 'fp-ts-rxjs/ObservableEither'
import * as D from 'fp-ts/Date'
import { pipe } from 'fp-ts/function'
import { empty } from 'fp-ts/lib/ReadonlyMap'
import { catchError, from, of } from 'rxjs'
import * as t from 'src/core/types'

import { FoodOverviewType1 } from '@/application/food-overview'

import { FridgyDatabase } from '@/infrastructure/dexie'

interface Config {
	readonly db: FridgyDatabase
}

export const dexieFoodOverview: FoodOverviewType1<OBS.URI> = {
	...OBS.Monad,
	...t.Observable,
	foods: of(empty),
	getNow: OBSE.fromIO(D.now)
}
