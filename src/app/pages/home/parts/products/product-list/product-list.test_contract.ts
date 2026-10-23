// What every adapter of `ProductList` must do. It holds no implementation: each adapter's
// `<port>.<backing>.test.ts` runs it with its own layer, and with the storage's own `insert` and `remove`, which
// write to that adapter's storage without a port.
import { describe, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import { ProductList, type StoredProduct } from './product-list.ts'

/** The adapter's storage, written without a port. */
export type Storage<R> = Readonly<{
  /** Stores a product, answering with its id. */
  insert: (snapshot: Product.Snapshot) => Effect.Effect<string, never, R>
  /** Removes the product stored under `id`. */
  remove: (id: string) => Effect.Effect<void, never, R>
}>

/** The list as it is now: `changes` emits it on subscription. */
const list = Effect.gen(function*() {
  const { changes } = yield* ProductList
  // `changes` never ends: it is stopped once the first list has arrived.
  const result = yield* Effect.flatMap(Channel.runHead(changes), Effect.fromOption).pipe(Effect.orDie)
  return yield* Result.match(result, {
    onFailure: () => Effect.die(new Error('the storage could not be read')),
    onSuccess: Effect.succeed,
  })
})

const withId = (products: ReadonlyArray<StoredProduct>, id: string) =>
  Arr.findFirst(products, (stored) => Opt.contains(stored.maybeId, id))

/** Products that expire come first, the soonest first; those that never expire come last. */
const isExpiringFirst = (products: ReadonlyArray<StoredProduct>) =>
  products.every((current, index) => {
    const next = products[index + 1]
    if (next === undefined) return true
    return Opt.match(current.maybeExpirationDate, {
      onNone: () => Opt.isNone(next.maybeExpirationDate),
      onSome: (date) =>
        Opt.match(next.maybeExpirationDate, {
          onNone: () => true,
          onSome: (later) => DateTime.isLessThanOrEqualTo(date, later),
        }),
    })
  })

export const productListContract = <R>(
  name: string,
  adapter: () => Layer.Layer<ProductList | R>,
  { insert, remove }: Storage<R>,
) =>
  describe(`ProductList contract (${name})`, () => {
    const add = (product: Product.Product) => insert(Product.toSnapshot(product))

    test('the list shows a written product as itself, under its id', () =>
      checkOnFreshLayer(
        adapter,
        ProductArbitrary.arbitrary,
        Effect.fnUntraced(function*(product) {
          const id = yield* add(product)
          const stored = withId(yield* list, id)
          return Opt.exists(stored, (s) => Equal.equals(Product.fromSnapshot(s), Opt.some(product)))
        }),
      ))

    test('the list is ordered by expiration, those that never expire last', () =>
      checkOnFreshLayer(
        adapter,
        fc.array(ProductArbitrary.arbitrary, { maxLength: 8 }),
        Effect.fnUntraced(function*(products) {
          yield* Effect.forEach(products, add)
          return isExpiringFirst(yield* list)
        }),
      ))

    test('a deleted product leaves the list', () =>
      checkOnFreshLayer(
        adapter,
        ProductArbitrary.arbitrary,
        Effect.fnUntraced(function*(product) {
          const id = yield* add(product)
          yield* remove(id)
          return Opt.isNone(withId(yield* list, id))
        }),
      ))

    // Intermediate lists may be skipped (the sql adapter keeps only the newest one while the reader is busy):
    // what is promised is that an open subscription eventually sees every write.
    test('an open subscription sees every write', () =>
      checkOnFreshLayer(
        adapter,
        ProductArbitrary.arbitrary,
        Effect.fnUntraced(function*(product) {
          const { changes } = yield* ProductList
          const lists = yield* Queue.unbounded<ReadonlyArray<StoredProduct>>()
          yield* Channel.runForEach(
            changes,
            (result) => Result.isSuccess(result) ? Effect.asVoid(Queue.offer(lists, result.success)) : Effect.void,
          )
            .pipe(Effect.forkScoped)
          const waitUntil = (predicate: (products: ReadonlyArray<StoredProduct>) => boolean): Effect.Effect<void> =>
            Queue.take(lists).pipe(
              Effect.flatMap((products) => predicate(products) ? Effect.void : waitUntil(predicate)),
            )
          yield* waitUntil(() => true)
          const id = yield* add(product)
          yield* waitUntil((products) => Opt.isSome(withId(products, id)))
          yield* remove(id)
          yield* waitUntil((products) => Opt.isNone(withId(products, id)))
          return true
        }, Effect.scoped),
      ))
  })
