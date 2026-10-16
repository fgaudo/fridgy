import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Layer from 'effect/Layer'
import * as Source from '#libs/source/source.ts'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import { ProductList, type StoredProducts } from '../../ports/product-list.ts'
import { InMemoryStore, type ProductRow } from '#infrastructure/in-memory/store.ts'

// Like the sql query: products without an expiration last.
const byExpiration = Order.mapInput(
  Opt.makeOrder(DateTime.Order),
  (row: ProductRow) => row.maybeExpirationDate,
)
const expiringFirst = Order.combine(
  Order.mapInput(Order.Boolean, (row: ProductRow) => Opt.isNone(row.maybeExpirationDate)),
  byExpiration,
)

export const layer = Layer.effect(
  ProductList,
  InMemoryStore.useSync(({ tables }) => ({
    changes: Source.fromStream(
      SubscriptionRef.changes(tables).pipe(
        Stream.map(({ products }): StoredProducts =>
          Result.succeed(Arr.map(Arr.sort(products, expiringFirst), (row) => ({
            maybeId: Opt.some(row.id.toString(10)),
            maybeName: Opt.some(row.name),
            maybeCreationDate: Opt.some(row.creationDate),
            maybeExpirationDate: row.maybeExpirationDate,
          })))
        ),
      ),
    ),
  })),
)
