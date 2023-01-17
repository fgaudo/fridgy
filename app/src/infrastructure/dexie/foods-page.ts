import { FoodsPageData } from '@/application/read/foods-page'
import { FridgyDatabase } from '@/infrastructure/dexie'
import { liveQuery } from 'dexie'
import * as RO from 'fp-ts-rxjs/ReaderObservable'
import { pipe } from 'fp-ts/function'
import * as R from 'fp-ts/Reader'
import { catchError, from } from 'rxjs'

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
          response => ({ foods: {} })
        )
      )
