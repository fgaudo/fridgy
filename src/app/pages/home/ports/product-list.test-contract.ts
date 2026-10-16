// What every adapter of Home's `ProductList` must do, given the writes of `ProductCommands` (whose own
// contract is `app/ports/product-commands.test-contract.ts`). It holds no implementation: each adapter's
// `<adapter>.test.ts` runs it with its own layers.
import { describe, expect, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as fc from 'fast-check'
import { add, check, deleteById } from '../../../ports/product-commands.test-contract.ts'
import * as ProductArbitrary from '../../../domain/product.test-arbitrary.ts'
import * as Product from '../../../domain/product.ts'
import type { ProductCommands } from '../../../ports/product-commands.ts'
import { ProductList, type StoredProduct } from './product-list.ts'

type Storage = ProductCommands | ProductList

/** The list as it is now: `changes` emits it on subscription. */
const list = Effect.gen(function*() {
  const { changes } = yield* ProductList
  const result = yield* Stream.runHead(changes).pipe(Effect.flatMap(Effect.fromOption), Effect.orDie)
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

export const productListContract = (name: string, adapter: () => Layer.Layer<Storage>) =>
  describe(`ProductList contract (${name})`, () => {
    test('the list shows a written product as itself, under its id', () =>
      check(adapter, ProductArbitrary.arbitrary, (product) =>
        Effect.gen(function*() {
          const id = yield* add(product)
          const stored = withId(yield* list, id)
          return Opt.exists(stored, (s) => Equal.equals(Product.fromSnapshot(s), Opt.some(product)))
        })))

    test('the list is ordered by expiration, those that never expire last', () =>
      check(adapter, fc.array(ProductArbitrary.arbitrary, { maxLength: 8 }), (products) =>
        Effect.gen(function*() {
          yield* Effect.forEach(products, add)
          return isExpiringFirst(yield* list)
        })))

    test('a deleted product leaves the list', () =>
      check(adapter, ProductArbitrary.arbitrary, (product) =>
        Effect.gen(function*() {
          const id = yield* add(product)
          yield* deleteById(id)
          return Opt.isNone(withId(yield* list, id))
        })))

    // Intermediate lists may be skipped (the sql adapter keeps only the newest one while the reader is busy):
    // what is promised is that an open subscription eventually sees every write.
    test('an open subscription sees every write', () =>
      check(adapter, ProductArbitrary.arbitrary, (product) =>
        Effect.gen(function*() {
          const { changes } = yield* ProductList
          const lists = yield* Queue.unbounded<ReadonlyArray<StoredProduct>>()
          yield* changes.pipe(
            Stream.runForEach((result) => Result.isSuccess(result) ? Queue.offer(lists, result.success) : Effect.void),
            Effect.forkScoped,
          )
          const waitUntil = (predicate: (products: ReadonlyArray<StoredProduct>) => boolean): Effect.Effect<void> =>
            Queue.take(lists).pipe(
              Effect.flatMap((products) => predicate(products) ? Effect.void : waitUntil(predicate)),
            )
          yield* waitUntil(() => true)
          const id = yield* add(product)
          yield* waitUntil((products) => Opt.isSome(withId(products, id)))
          yield* deleteById(id)
          yield* waitUntil((products) => Opt.isNone(withId(products, id)))
          return true
        }).pipe(Effect.scoped)))

    // Home listens to it as a subscription, and a subscription that ends is a bug.
    test('the changes never end', async () => {
      const ended = await Effect.runPromise(
        Effect.gen(function*() {
          const { changes } = yield* ProductList
          return yield* Stream.runDrain(changes).pipe(Effect.timeoutOption('200 millis'))
        }).pipe(Effect.provide(adapter())),
      )
      expect(Opt.isNone(ended)).toBe(true)
    })
  })
