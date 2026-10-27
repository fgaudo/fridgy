import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as SqlResolver from 'effect/sql/SqlResolver'
import { ProductStore } from './products.ts'

const names = ['Milk', 'Meat', 'Cheese', 'Eggs', 'Butter', 'Yogurt', 'Bread']

/** Fills an empty database with products that expire one a day, from today. */
export const layer = Layer.effectDiscard(Effect.gen(function*() {
  const { insert } = yield* ProductStore
  const now = yield* DateTime.now
  yield* Effect.forEach(
    Arr.map(names, (name, days) => ({
      name,
      creationDate: now,
      maybeExpirationDate: Opt.some(DateTime.add(now, { days })),
    })),
    (product) => SqlResolver.request(product, insert),
  )
  yield* Effect.logInfo('Storage ready: in memory, with sample products', { count: names.length })
})).pipe(Layer.provide(ProductStore.layer), Layer.orDie)
