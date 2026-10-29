import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as SqlResolver from 'effect/sql/SqlResolver'
import * as Day from '#libs/dates/day.ts'
import { ProductStore } from './products.ts'

const names = ['Milk', 'Meat', 'Cheese', 'Eggs', 'Butter', 'Yogurt', 'Bread']

/**
 * Fills an empty database with products bought three days ago that expire one a day, from yesterday: one has
 * expired, one expires today, and the others have more or less of their life left. The days are the device's.
 */
export const layer = Layer.effectDiscard(Effect.gen(function*() {
  const { insert } = yield* ProductStore
  const now = yield* DateTime.nowInCurrentZone
  yield* Effect.forEach(
    Arr.map(names, (name, index) => ({
      name,
      creationDate: DateTime.toUtc(DateTime.subtract(now, { days: 3 })),
      maybeExpirationDate: Opt.some(Day.addDays(Day.fromDateTime(now), index - 1)),
    })),
    (product) => SqlResolver.request(product, insert),
  )
  yield* Effect.logInfo('Storage ready: in memory, with sample products', { count: names.length })
})).pipe(Layer.provide(ProductStore.layer), Layer.orDie)
