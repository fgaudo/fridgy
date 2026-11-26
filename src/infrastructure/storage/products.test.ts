import { describe, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import * as Queue from 'effect/Queue'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import * as Day from '#libs/dates/day.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import { insertRow, refuseWritesOf } from './products.test_support.ts'
import { ProductStore, type StoredProduct } from './products.ts'
import * as SqliteMemory from './sqlite.memory.ts'

const layer = () => ProductStore.layer.pipe(Layer.provideMerge(SqliteMemory.layer))

/** The list as it is now: `changes` emits it on subscription. */
const list = Effect.gen(function*() {
  const { changes } = yield* ProductStore
  // `changes` never ends: it is stopped once the first list has arrived.
  const result = yield* Effect.flatMap(Channel.runHead(changes), Effect.fromOption).pipe(Effect.orDie)
  return yield* Result.match(result, {
    onFailure: () => Effect.die(new Error('the storage could not be read')),
    onSuccess: Effect.succeed,
  })
})

const withId = (products: ReadonlyArray<StoredProduct>, id: Product.ProductId) =>
  Arr.findFirst(products, (stored) => stored.id === id)

const isProductOf = (product: Product.Product) => (stored: StoredProduct) =>
  Equal.equals(Product.fromSnapshot(stored), Opt.some(product))

const add = (product: Product.Product) =>
  ProductStore.use(({ insertAll }) => insertAll([Product.toSnapshot(product)])).pipe(
    Effect.flatMap((ids) => Effect.fromOption(Arr.head(ids))),
    Effect.orDie,
  )

const addAll = (products: ReadonlyArray<Product.Product>) =>
  ProductStore.use(({ insertAll }) => insertAll(Arr.map(products, Product.toSnapshot)))

const deleteAll = (ids: ReadonlyArray<Product.ProductId>) => ProductStore.use(({ deleteAll }) => deleteAll(ids))

const update = (id: Product.ProductId, product: Product.Product) =>
  ProductStore.use(({ update }) => update(id, Product.toSnapshot(product)))

const readsBackAs = (id: Product.ProductId, product: Product.Product) =>
  Effect.map(list, (listed) => Opt.exists(withId(listed, id), isProductOf(product)))

/** Products that expire come first, the soonest first; those that never expire come last. */
const isExpiringFirst = (products: ReadonlyArray<StoredProduct>) =>
  products.every((current, index) => {
    const next = products[index + 1]
    if (next === undefined) return true
    return Opt.match(Opt.flatten(current.maybeExpirationDate), {
      onNone: () => Opt.isNone(Opt.flatten(next.maybeExpirationDate)),
      onSome: (date) =>
        Opt.match(Opt.flatten(next.maybeExpirationDate), {
          onNone: () => true,
          onSome: (later) => Order.isLessThanOrEqualTo(Day.Order)(date, later),
        }),
    })
  })

/** Products with the same expiration, or with none, are listed in the order they were written, `ids`. */
const isWrittenOrderAmongEquals = (products: ReadonlyArray<StoredProduct>, ids: ReadonlyArray<Product.ProductId>) => {
  const writtenAt = (product: StoredProduct) => ids.indexOf(product.id)
  return products.every((current, index) => {
    const next = products[index + 1]
    if (next === undefined || !Equal.equals(current.maybeExpirationDate, next.maybeExpirationDate)) return true
    return writtenAt(current) !== -1 && writtenAt(current) < writtenAt(next)
  })
}

// Products drawn from a few, so that some share an expiration.
const withEqualExpirations = fc.array(ProductArbitrary.arbitrary, { minLength: 1, maxLength: 3 }).chain((few) =>
  fc.array(fc.constantFrom(...few), { maxLength: 8 })
)

const expiring = ProductArbitrary.arbitrary.filter((product) => Opt.isSome(product.maybeExpirationDate))

const everlasting = ProductArbitrary.arbitrary.filter((product) => Opt.isNone(product.maybeExpirationDate))

describe('the list', () => {
  test('shows a written product as itself, under the id it was given', () =>
    checkOnFreshLayer(
      layer,
      ProductArbitrary.arbitrary,
      Effect.fnUntraced(function*(product) {
        return yield* readsBackAs(yield* add(product), product)
      }),
    ))

  test('is ordered by expiration, those that never expire last, and by writing among equals', () =>
    checkOnFreshLayer(
      layer,
      fc.oneof(fc.array(ProductArbitrary.arbitrary, { maxLength: 8 }), withEqualExpirations),
      Effect.fnUntraced(function*(products) {
        const ids = yield* Effect.forEach(products, add)
        const listed = yield* list
        return isExpiringFirst(listed) && isWrittenOrderAmongEquals(listed, ids)
      }),
    ))

  test('shows an updated product as written, under its id, in its new place', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(
        fc.array(ProductArbitrary.arbitrary, { maxLength: 6 }),
        ProductArbitrary.arbitrary,
        ProductArbitrary.arbitrary,
      ),
      Effect.fnUntraced(function*([products, before, updated]) {
        const ids = yield* Effect.forEach(products, add)
        const id = yield* add(before)
        yield* update(id, updated)
        const listed = yield* list
        return ids.every((other) => Opt.isSome(withId(listed, other))) && isExpiringFirst(listed)
          && Opt.exists(withId(listed, id), isProductOf(updated))
      }),
    ))

  // One row that cannot be read takes neither the others nor itself out of the list: it can still be deleted.
  test('shows rows whose creation date or expiration cannot be read, under their id and name, as no products, beside the products', () =>
    checkOnFreshLayer(
      layer,
      fc.array(ProductArbitrary.arbitrary, { maxLength: 6 }),
      Effect.fnUntraced(function*(products) {
        const ids = yield* Effect.forEach(products, add)
        const unreadable = yield* Effect.forEach([
          { name: 'Milk', creationDate: 'not a date', maybeExpirationDate: Opt.none() },
          { name: 'Eggs', creationDate: '2026-11-26T10:00:00.000Z', maybeExpirationDate: Opt.some('not a day') },
        ], (row) => Effect.map(insertRow(row), (id) => ({ id, name: row.name })))
        const listed = yield* list
        return listed.length === products.length + unreadable.length
          && unreadable.every(({ id, name }) =>
            Opt.exists(
              withId(listed, id),
              (stored) =>
                Opt.contains(stored.maybeName, name) && Opt.isNone(Product.fromSnapshot(stored))
                // Each row is no product by one field alone.
                && Opt.isNone(stored.maybeCreationDate) !== Opt.isNone(stored.maybeExpirationDate),
            )
          )
          && products.every((product, index) =>
            Opt.exists(Arr.get(ids, index).pipe(Opt.flatMap((id) => withId(listed, id))), isProductOf(product))
          )
      }),
    ))

  // Intermediate lists may be skipped (only the newest one is kept while the reader is busy): what is promised is
  // that an open subscription eventually sees every write.
  test('an open subscription sees every write', () =>
    checkOnFreshLayer(
      layer,
      ProductArbitrary.arbitrary,
      Effect.fnUntraced(function*(product) {
        const { changes } = yield* ProductStore
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
        yield* deleteAll([id])
        yield* waitUntil((products) => Opt.isNone(withId(products, id)))
        return true
      }, Effect.scoped),
    ))
})

describe('insertAll', () => {
  test('gives products stored together distinct ids, under which each reads back as itself', () =>
    checkOnFreshLayer(
      layer,
      fc.array(ProductArbitrary.arbitrary, { minLength: 1, maxLength: 6 }),
      Effect.fnUntraced(function*(products) {
        const ids = yield* addAll(products)
        const listed = yield* list
        return ids.length === products.length && new Set(ids).size === ids.length
          && products.every((product, index) =>
            Opt.exists(Arr.get(ids, index).pipe(Opt.flatMap((id) => withId(listed, id))), isProductOf(product))
          )
      }),
    ))

  test('stores none of the products when one cannot be stored, and fails with ProductsWriteError', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(
        fc.array(ProductArbitrary.arbitrary, { maxLength: 3 }),
        expiring,
        fc.array(ProductArbitrary.arbitrary, { maxLength: 3 }),
      ),
      Effect.fnUntraced(function*([before, refused, after]) {
        yield* refuseWritesOf(refused.name)
        const failure = yield* Effect.flip(addAll([...before, refused, ...after]))
        return failure._tag === 'ProductsWriteError' && (yield* list).length === 0
      }),
    ))
})

describe('deleteAll', () => {
  test('removes the products it is given, and only them', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(
        fc.array(ProductArbitrary.arbitrary, { maxLength: 4 }),
        fc.array(ProductArbitrary.arbitrary, { maxLength: 4 }),
      ),
      Effect.fnUntraced(function*([kept, deleted]) {
        const keptIds = yield* Effect.forEach(kept, add)
        const deletedIds = yield* Effect.forEach(deleted, add)
        yield* deleteAll(deletedIds)
        const listed = yield* list
        return deletedIds.every((id) => Opt.isNone(withId(listed, id)))
          && kept.every((product, index) =>
            Opt.exists(Arr.get(keptIds, index).pipe(Opt.flatMap((id) => withId(listed, id))), isProductOf(product))
          )
      }),
    ))

  // SQLite gives the next product the id of the last one deleted: an expiration left behind would be its.
  test('leaves no expiration behind for a product stored after it', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(expiring, everlasting),
      Effect.fnUntraced(function*([expiring, everlasting]) {
        yield* deleteAll([yield* add(expiring)])
        return yield* readsBackAs(yield* add(everlasting), everlasting)
      }),
    ))

  test('completes and changes nothing for a product deleted already', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
      Effect.fnUntraced(function*([kept, deleted]) {
        const keptId = yield* add(kept)
        const deletedId = yield* add(deleted)
        yield* deleteAll([deletedId])
        yield* deleteAll([deletedId])
        return (yield* readsBackAs(keptId, kept)) && (yield* list).length === 1
      }),
    ))

  test('lets a deleted product be stored again, once, as itself', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
      Effect.fnUntraced(function*([kept, deleted]) {
        const keptId = yield* add(kept)
        yield* deleteAll([yield* add(deleted)])
        yield* addAll([deleted])
        return (yield* list).filter(isProductOf(deleted)).length === 1 && (yield* readsBackAs(keptId, kept))
      }),
    ))

  test('deletes none of the products when one cannot be deleted, and fails with ProductsWriteError', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(
        fc.array(ProductArbitrary.arbitrary, { maxLength: 3 }),
        ProductArbitrary.arbitrary,
        fc.array(ProductArbitrary.arbitrary, { maxLength: 3 }),
      ),
      Effect.fnUntraced(function*([before, refused, after]) {
        const products = [...before, refused, ...after]
        const ids = yield* Effect.forEach(products, add)
        yield* refuseWritesOf(refused.name)
        const failure = yield* Effect.flip(deleteAll(ids))
        const listed = yield* list
        return failure._tag === 'ProductsWriteError'
          && products.every((product, index) =>
            Opt.exists(Arr.get(ids, index).pipe(Opt.flatMap((id) => withId(listed, id))), isProductOf(product))
          )
      }),
    ))
})

describe('update', () => {
  test('writes the product as given, and leaves the others as they were', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
      Effect.fnUntraced(function*([kept, before, after]) {
        const keptId = yield* add(kept)
        const id = yield* add(before)
        yield* update(id, after)
        return (yield* readsBackAs(id, after)) && (yield* readsBackAs(keptId, kept))
      }),
    ))

  // The list joins the expiration: one left behind, or a second one, would show.
  test('adds, changes and removes the expiration with the product', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(everlasting, expiring, expiring),
      Effect.fnUntraced(function*([first, added, changed]) {
        const id = yield* add(first)
        yield* update(id, added)
        const isAdded = yield* readsBackAs(id, added)
        yield* update(id, changed)
        const isChanged = yield* readsBackAs(id, changed)
        yield* update(id, first)
        const isRemoved = yield* readsBackAs(id, first)
        return isAdded && isChanged && isRemoved && (yield* list).length === 1
      }),
    ))

  test('fails with ProductNotStored for a product deleted since it was read, and changes nothing', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(ProductArbitrary.arbitrary, ProductArbitrary.arbitrary, ProductArbitrary.arbitrary),
      Effect.fnUntraced(function*([stored, deleted, written]) {
        const id = yield* add(stored)
        const deletedId = yield* add(deleted)
        yield* deleteAll([deletedId])
        const failure = yield* Effect.flip(update(deletedId, written))
        return failure._tag === 'ProductNotStored' && (yield* readsBackAs(id, stored))
          && (yield* list).length === 1
      }),
    ))

  test('leaves the product as it was when its expiration cannot be written, and fails with ProductsWriteError', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(ProductArbitrary.arbitrary, expiring),
      Effect.fnUntraced(function*([before, after]) {
        const id = yield* add(before)
        yield* refuseWritesOf(after.name)
        const failure = yield* Effect.flip(update(id, after))
        return failure._tag === 'ProductsWriteError' && (yield* readsBackAs(id, before))
      }),
    ))
})
