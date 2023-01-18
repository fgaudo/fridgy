import { liveQuery } from 'dexie'
import { pipe } from 'fp-ts/function'
import * as R from 'fp-ts/Reader'
import * as RO from 'fp-ts-rxjs/ReaderObservable'
import { catchError, from } from 'rxjs'

import { FoodsPageData } from '@/application/read/foods-page'
import { FridgyDatabase } from '@/infrastructure/dexie'

interface Config { readonly db: FridgyDatabase }

export const foodsPageData$: RO.ReaderObservable<Config, FoodsPageData> =
      pipe(
        R.ask<Config>(),
        R.map(({ db }) =>
          from(
            liveQuery(async () => await db.foods.toArray())
          ).pipe(
            catchError((e, source) => {
              console.error(e)
              return source
            })
          )
        ),
        RO.map(
          response => ({ foods: new Map() })
        )
      )
