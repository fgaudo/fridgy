import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import * as OE from 'fp-ts-rxjs/ObservableEither'

import * as R from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { FoodsPageDataObservable } from '@/application/read/get-foods'
import { FridgyDatabase } from '.'
import { liveQuery } from 'dexie'
import { from } from 'rxjs'

interface Config { db: FridgyDatabase }

export const foodsPageObservable: R.Reader<Config, FoodsPageDataObservable> =
      pipe(
        R.ask<Config>(),
        R.map(({ db }) =>
          OE.tryCatch(
            from(
              liveQuery(async () => await db.foods.toArray())
            )
          )
        ),
        ROE.bimap(
          e => ({ type: 'io', message: '' } as const),
          response => ({ foods: [] })
        )
      )
