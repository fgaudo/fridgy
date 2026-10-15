import { describe, expect, test } from 'bun:test'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as NonEmptyArray from '@/libs/collections/non-empty-array.arbitrary.ts'
import * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.arbitrary.ts'
import * as PositiveInteger from '@/libs/numbers/positive-integer.ts'
import * as UnitInterval from '@/libs/numbers/unit-interval.arbitrary.ts'
import { InternalMessage } from './messages.ts'
import { FetchListVersion, type State } from './state.ts'
import { update } from './update.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductList = State['productListData']
type Available = Data.TaggedEnum.Value<ProductList, 'Available'>
type Product = Available['products'][number]
type ValidProduct = Data.TaggedEnum.Value<Product, 'Valid'>
type AddProduct = State['addProduct']
type ValidatedResult = Data.TaggedEnum.Value<InternalMessage, 'ProductsValidated'>['result']
type ValidatedProduct = Data.TaggedEnum.Value<InternalMessage, 'ProductsValidated'> extends {
  result: Result.Result<Opt.Option<ReadonlyArray<infer P>>, void>
} ? P
  : never

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const maybe = <A>(arbitrary: fc.Arbitrary<A>): fc.Arbitrary<Opt.Option<A>> =>
  fc.option(arbitrary, { nil: undefined }).map((value) => (value === undefined ? Opt.none() : Opt.some(value)))

// A small id space, so that selections and product lists overlap often.
const id: fc.Arbitrary<string> = fc.constantFrom('1', '2', '3', '4', '5', '6')

const date = fc.integer({ min: 0, max: 4_102_444_800_000 }).map((millis) => DateTime.makeUnsafe(millis))

const status: fc.Arbitrary<ValidProduct['status']> = fc.oneof(
  fc.constant({ _tag: 'Everlasting' } as const),
  date.map((expirationDate) => ({ _tag: 'Stale', expirationDate } as const)),
  fc.record({
    expirationDate: date,
    timeLeft: fc.nat().map(Duration.millis),
    freshnessRatio: UnitInterval.arbitrary,
  }).map((fields) => ({ _tag: 'Fresh', ...fields } as const)),
)

const product: fc.Arbitrary<Product> = fc.oneof(
  fc.record({ id, name: fc.string(), status }).map((fields) => ({ _tag: 'Valid', ...fields } as const)),
  fc.record({ id, maybeName: maybe(fc.string()) }).map((fields) => ({ _tag: 'Invalid', ...fields } as const)),
  maybe(fc.string()).map((maybeName) => ({ _tag: 'Corrupt', id: Symbol('corrupt'), maybeName } as const)),
)

const selection = maybe(NonEmptyHashSet.arbitrary(id))

const available: fc.Arbitrary<Available> = fc.record({
  activity: fc.constantFrom('idle', 'deleting', 'fetching', 'adding'),
  products: NonEmptyArray.arbitrary(product),
  maybeSelectedProducts: selection,
}).map((fields) => ({
  _tag: 'Available',
  ...fields,
  total: PositiveInteger.fromNumberUnsafe(fields.products.length),
}))

const productList: fc.Arbitrary<ProductList> = fc.oneof(
  fc.record({
    _tag: fc.constantFrom('Initial', 'Error', 'Empty'),
    activity: fc.constantFrom('idle', 'fetching', 'adding'),
  }),
  available,
)

const openForm = fc.record({
  isSubmittable: fc.boolean(),
  maybeName: maybe(fc.string()),
  maybeExpirationDate: maybe(date),
}).map((fields) => ({ _tag: 'Open', ...fields } as const))

const addProduct: fc.Arbitrary<AddProduct> = fc.oneof(fc.constant({ _tag: 'Closed' } as const), openForm)

const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  isViewportAtTop: fc.boolean(),
  isInteracting: fc.boolean(),
  versions: fc.bigInt({ min: 0n, max: 1_000n }).map((version) => ({
    manualFetcher: FetchListVersion.make(version),
  })),
  addProduct,
  productListData: productList,
})

const stateWith = <K extends keyof State>(key: K, arbitrary: fc.Arbitrary<State[K]>) =>
  fc.tuple(state, arbitrary).map(([base, value]): State => ({ ...base, [key]: value }))

const storedProducts = fc.array(
  fc.record({
    maybeId: maybe(id),
    maybeName: maybe(fc.string()),
    maybeCreationDate: maybe(date),
    maybeExpirationDate: maybe(date),
  }),
  { maxLength: 8 },
)

const validatedProduct: fc.Arbitrary<ValidatedProduct> = fc.oneof(
  fc.record({ id, name: fc.string(), status }).map((fields) => ({ _tag: 'Valid', ...fields } as const)),
  fc.record({ maybeId: maybe(id), maybeName: maybe(fc.string()) }).map((fields) => (
    { _tag: 'Invalid', ...fields } as const
  )),
)

const validatedResult: fc.Arbitrary<ValidatedResult> = fc.oneof(
  fc.constant(Result.fail(undefined)),
  fc.constant(Result.succeed(Opt.none())),
  NonEmptyArray.arbitrary(validatedProduct).map((products) => Result.succeed(Opt.some(products))),
)

const message: fc.Arbitrary<InternalMessage> = fc.oneof(
  fc.constant(InternalMessage.DeleteStarted()),
  id.map((id) => InternalMessage.ItemToggled({ id })),
  fc.constant(InternalMessage.ClearSelected()),
  fc.constant(InternalMessage.MenuToggled()),
  fc.constant(InternalMessage.AddProductToggled()),
  fc.constant(InternalMessage.AddProductStarted()),
  fc.boolean().map((isAtTop) => InternalMessage.ViewportAtTopChanged({ isAtTop })),
  fc.boolean().map((isCloseToTop) => InternalMessage.ViewportCloseToTopChanged({ isCloseToTop })),
  fc.boolean().map((isInteracting) => InternalMessage.InteractionChanged({ isInteracting })),
  fc.string().map((name) => InternalMessage.NameChanged({ name })),
  fc.oneof(fc.string(), fc.integer()).map((expiration) => InternalMessage.ExpirationDateChanged({ expiration })),
  fc.boolean().map((succeeded) => InternalMessage.AddProductCompleted({ succeeded })),
  fc.oneof(
    fc.constant(Result.fail(undefined)),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => InternalMessage.ProductsChanged({ result })),
  validatedResult.map((result) => InternalMessage.ProductsValidated({ result })),
  fc.boolean().map((succeeded) => InternalMessage.DeleteProductsCompleted({ succeeded })),
  fc.constant(InternalMessage.NoOp()),
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const step = (msg: InternalMessage, before: State) => {
  const { state: after, commands = [] } = update(msg)(before)
  return { after, commands }
}

/** `after` equals `before` except, at most, for the given top-level keys. */
const onlyChanged = (before: State, after: State, ...keys: ReadonlyArray<keyof State>) =>
  Equal.equals(after, { ...before, ...Object.fromEntries(keys.map((key) => [key, after[key]])) })

const assertProperty = <Ts extends [unknown, ...Array<unknown>]>(
  arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> },
  predicate: (...args: Ts) => boolean,
) => fc.assert(fc.property<Ts>(...[...arbitraries, predicate] as const))

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Home update', () => {
  describe('in general', () => {
    test('handles every message in every state without throwing', () => {
      assertProperty([state, message], (before, msg) => {
        step(msg, before)
        return true
      })
    })

    test('never changes the version unless deleting', () => {
      assertProperty([state, message], (before, msg) => {
        const { after } = step(msg, before)
        return msg._tag === 'DeleteStarted'
          || after.versions.manualFetcher === before.versions.manualFetcher
      })
    })
  })

  describe('NoOp', () => {
    test('changes nothing and runs nothing', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(InternalMessage.NoOp(), before)
        return Equal.equals(after, before) && commands.length === 0
      })
    })
  })

  describe('MenuToggled', () => {
    test('flips the menu and touches nothing else', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(InternalMessage.MenuToggled(), before)
        return after.isMenuOpen === !before.isMenuOpen
          && onlyChanged(before, after, 'isMenuOpen')
          && commands.length === 0
      })
    })

    test('toggling twice restores the state', () => {
      assertProperty([state], (before) => {
        const once = step(InternalMessage.MenuToggled(), before).after
        return Equal.equals(step(InternalMessage.MenuToggled(), once).after, before)
      })
    })
  })

  describe('InteractionChanged', () => {
    test('stores the flag, is idempotent and touches nothing else', () => {
      assertProperty([state, fc.boolean()], (before, isInteracting) => {
        const msg = InternalMessage.InteractionChanged({ isInteracting })
        const { after, commands } = step(msg, before)
        return after.isInteracting === isInteracting
          && onlyChanged(before, after, 'isInteracting')
          && Equal.equals(step(msg, after).after, after)
          && commands.length === 0
      })
    })
  })

  describe('ViewportAtTopChanged', () => {
    test('stores the flag and touches nothing else', () => {
      assertProperty([state, fc.boolean()], (before, isAtTop) => {
        const { after, commands } = step(InternalMessage.ViewportAtTopChanged({ isAtTop }), before)
        return after.isViewportAtTop === isAtTop
          && onlyChanged(before, after, 'isViewportAtTop')
          && commands.length === 0
      })
    })
  })

  describe('ViewportCloseToTopChanged', () => {
    test('scrolls to the top only when close to it and not interacting', () => {
      assertProperty([state, fc.boolean()], (before, isCloseToTop) => {
        const { after, commands } = step(InternalMessage.ViewportCloseToTopChanged({ isCloseToTop }), before)
        const shouldScroll = isCloseToTop && !before.isInteracting
        return Equal.equals(after, before) && commands.length === (shouldScroll ? 1 : 0)
      })
    })
  })

  describe('ProductsChanged', () => {
    test('leaves the state alone and asks for validation', () => {
      assertProperty([state, message.filter((msg) => msg._tag === 'ProductsChanged')], (before, msg) => {
        const { after, commands } = step(msg, before)
        return Equal.equals(after, before) && commands.length === 1
      })
    })
  })

  describe('ProductsValidated', () => {
    test('a failure keeps the initial state, otherwise shows an idle error', () => {
      assertProperty([state], (before) => {
        const { after } = step(InternalMessage.ProductsValidated({ result: Result.fail(undefined) }), before)
        return before.productListData._tag === 'Initial'
          ? Equal.equals(after, before)
          : after.productListData._tag === 'Error' && after.productListData.activity === 'idle'
      })
    })

    test('no products means an idle empty list', () => {
      assertProperty([state], (before) => {
        const { after } = step(InternalMessage.ProductsValidated({ result: Result.succeed(Opt.none()) }), before)
        return after.productListData._tag === 'Empty' && after.productListData.activity === 'idle'
      })
    })

    test('products make the list available, idle and with the right total', () => {
      assertProperty([state, NonEmptyArray.arbitrary(validatedProduct)], (before, products) => {
        const { after } = step(
          InternalMessage.ProductsValidated({ result: Result.succeed(Opt.some(products)) }),
          before,
        )
        const list = after.productListData
        return list._tag === 'Available'
          && list.activity === 'idle'
          && list.total === products.length
          && list.products.length === products.length
          && onlyChanged(before, after, 'productListData')
      })
    })

    test('the selection keeps only ids that are still valid products', () => {
      assertProperty([stateWith('productListData', available), NonEmptyArray.arbitrary(validatedProduct)], (before, products) => {
        const { after } = step(
          InternalMessage.ProductsValidated({ result: Result.succeed(Opt.some(products)) }),
          before,
        )
        const validIds = HashSet.fromIterable(
          products.flatMap((product) => (product._tag === 'Valid' ? [product.id] : [])),
        )
        return after.productListData._tag === 'Available'
          && Opt.match(after.productListData.maybeSelectedProducts, {
            onNone: () => true,
            onSome: (selected) => HashSet.isSubset(selected, validIds),
          })
      })
    })
  })

  describe('ItemToggled', () => {
    const idleAvailable = available.map((list): Available => ({ ...list, activity: 'idle' }))

    test('toggles membership of the id in the selection', () => {
      assertProperty([stateWith('productListData', idleAvailable), id], (before, itemId) => {
        const wasSelected = before.productListData._tag === 'Available'
          && Opt.exists(before.productListData.maybeSelectedProducts, HashSet.has(itemId))
        const { after, commands } = step(InternalMessage.ItemToggled({ id: itemId }), before)
        const isSelected = after.productListData._tag === 'Available'
          && Opt.exists(after.productListData.maybeSelectedProducts, HashSet.has(itemId))
        return isSelected === !wasSelected && commands.length === 0
      })
    })

    test('toggling twice restores the state', () => {
      assertProperty([stateWith('productListData', idleAvailable), id], (before, itemId) => {
        const msg = InternalMessage.ItemToggled({ id: itemId })
        return Equal.equals(step(msg, step(msg, before).after).after, before)
      })
    })

    test('is rejected unless the list is available and idle', () => {
      assertProperty([state, id], (before, itemId) => {
        const list = before.productListData
        fc.pre(list._tag !== 'Available' || list.activity !== 'idle')
        const { after, commands } = step(InternalMessage.ItemToggled({ id: itemId }), before)
        return Equal.equals(after, before) && commands.length === 1
      })
    })
  })

  describe('ClearSelected', () => {
    test('empties the selection, or is rejected when there is nothing to clear', () => {
      assertProperty([state], (before) => {
        const list = before.productListData
        const { after, commands } = step(InternalMessage.ClearSelected(), before)
        const canClear = list._tag === 'Available' && list.activity === 'idle'
          && Opt.isSome(list.maybeSelectedProducts)
        return canClear
          ? after.productListData._tag === 'Available'
            && Opt.isNone(after.productListData.maybeSelectedProducts)
            && commands.length === 0
          : Equal.equals(after, before) && commands.length === 1
      })
    })
  })

  describe('DeleteStarted', () => {
    test('with a selection and no fetch or delete in progress, starts deleting and bumps the version', () => {
      assertProperty([stateWith('productListData', available)], (before) => {
        const list = before.productListData
        fc.pre(list._tag === 'Available' && Opt.isSome(list.maybeSelectedProducts))
        fc.pre(list.activity !== 'fetching' && list.activity !== 'deleting')
        const { after, commands } = step(InternalMessage.DeleteStarted(), before)
        return after.productListData.activity === 'deleting'
          && after.versions.manualFetcher === before.versions.manualFetcher + 1n
          && commands.length === 1
      })
    })

    test('is rejected otherwise', () => {
      assertProperty([state], (before) => {
        const list = before.productListData
        fc.pre(
          list._tag !== 'Available' || Opt.isNone(list.maybeSelectedProducts)
            || list.activity === 'fetching' || list.activity === 'deleting',
        )
        const { after, commands } = step(InternalMessage.DeleteStarted(), before)
        return Equal.equals(after, before) && commands.length === 1
      })
    })
  })

  describe('DeleteProductsCompleted', () => {
    test('ends a deletion, warning the user only on failure', () => {
      assertProperty([state, fc.boolean()], (before, succeeded) => {
        const { after, commands } = step(InternalMessage.DeleteProductsCompleted({ succeeded }), before)
        return before.productListData.activity === 'deleting'
          ? after.productListData.activity === 'idle' && commands.length === (succeeded ? 0 : 1)
          : Equal.equals(after, before) && commands.length === 1
      })
    })
  })

  describe('AddProductStarted', () => {
    test('starts adding only from an open form with a name while idle', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(InternalMessage.AddProductStarted(), before)
        const canStart = before.addProduct._tag === 'Open'
          && Opt.isSome(before.addProduct.maybeName)
          && before.productListData.activity === 'idle'
        return commands.length === 1 && (
          canStart
            ? after.productListData.activity === 'adding' && onlyChanged(before, after, 'productListData')
            : Equal.equals(after, before)
        )
      })
    })
  })

  describe('AddProductCompleted', () => {
    test('goes back to idle, warning the user only on failure', () => {
      assertProperty([state, fc.boolean()], (before, succeeded) => {
        const { after, commands } = step(InternalMessage.AddProductCompleted({ succeeded }), before)
        return after.productListData.activity === 'idle'
          && onlyChanged(before, after, 'productListData')
          && commands.length === (succeeded ? 0 : 1)
      })
    })
  })

  // These properties describe the intended behaviour, which the current
  // `update` does not satisfy. `test.failing` keeps the suite green and turns
  // red as soon as a bug is fixed, so the marker can be removed.
  describe('known bugs', () => {
    test.failing('NameChanged stores the name in the open form', () => {
      assertProperty([stateWith('addProduct', openForm), fc.string()], (before, name) => {
        const { after } = step(InternalMessage.NameChanged({ name }), before)
        return after.addProduct._tag === 'Open' && Equal.equals(after.addProduct.maybeName, Opt.some(name))
      })
    })

    test.failing('ExpirationDateChanged stores the parsed date in the open form', () => {
      assertProperty([stateWith('addProduct', openForm), fc.integer({ min: 0, max: 4_102_444_800_000 })], (
        before,
        expiration,
      ) => {
        const { after } = step(InternalMessage.ExpirationDateChanged({ expiration }), before)
        return after.addProduct._tag === 'Open'
          && Equal.equals(after.addProduct.maybeExpirationDate, DateTime.make(expiration))
      })
    })

    test.failing('AddProductToggled opens and closes the form', () => {
      assertProperty([state], (before) => {
        const { after } = step(InternalMessage.AddProductToggled(), before)
        return after.addProduct._tag !== before.addProduct._tag
      })
    })

    test.failing('is deterministic (Corrupt products get a fresh Symbol id on every call)', () => {
      assertProperty([state, message], (before, msg) =>
        Equal.equals(
          step(msg, before).after,
          step(msg, before).after,
        ))
    })

    test.failing('Error and Empty lists carry no stale product data', () => {
      assertProperty([stateWith('productListData', available)], (before) => {
        const { after } = step(InternalMessage.ProductsValidated({ result: Result.succeed(Opt.none()) }), before)
        return Equal.equals(after.productListData, { _tag: 'Empty', activity: 'idle' })
      })
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every product list and form variant', () => {
  const tags = new Set(fc.sample(state, 500).flatMap((s) => [s.productListData._tag, s.addProduct._tag]))
  expect([...tags].sort()).toEqual(['Available', 'Closed', 'Empty', 'Error', 'Initial', 'Open'])
})
