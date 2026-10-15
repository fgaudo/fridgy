import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type ProductRow = Readonly<{
  id: number
  name: string
  creationDate: DateTime.Utc
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}>

export type Tables = Readonly<{
  nextProductId: number
  products: ReadonlyArray<ProductRow>
}>

const seedNames = ['Milk', 'Meat', 'Cheese', 'Eggs', 'Butter', 'Yogurt', 'Bread']

/**
 * The in-memory counterpart of the sqlite database: one store shared by every adapter, so what one
 * page writes another one reads. `SubscriptionRef.changes` is its change stream.
 */
export class InMemoryStore extends Context.Service<
  InMemoryStore,
  { readonly tables: SubscriptionRef.SubscriptionRef<Tables> }
>()('90b33408628e4e21', {
  make: Effect.gen(function*() {
    const now = yield* DateTime.now
    const tables = yield* SubscriptionRef.make<Tables>({
      nextProductId: seedNames.length + 1,
      products: Arr.map(seedNames, (name, index) => ({
        id: index + 1,
        name,
        creationDate: now,
        maybeExpirationDate: Opt.some(DateTime.add(now, { days: index })),
      })),
    })
    return { tables }
  }),
}) {
  static layer = Layer.effect(this, this.make)
}
