import { describe, expect, test } from 'bun:test'
import type * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import type { VNode } from 'snabbdom'
import * as NonEmptyArray from '@/libs/collections/non-empty-array.arbitrary.ts'
import * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.arbitrary.ts'
import * as Engine from '@/libs/elm/engine.ts'
import * as UnitInterval from '@/libs/numbers/unit-interval.arbitrary.ts'
import { view } from '../view.ts'
import { InternalMessage } from './messages.ts'
import { makeModel } from './model.ts'
import { OperationId, type Product, type State } from './state.ts'
import { update } from './update.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ValidProduct = Data.TaggedEnum.Value<Product, 'Valid'>
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

// Operations already started have small ids; the next one is always larger.
const operation = fc.integer({ min: 0, max: 9 }).map(OperationId.make)
const nextOperation = fc.integer({ min: 10, max: 20 }).map(OperationId.make)

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
  maybe(fc.string()).map((maybeName) => ({ _tag: 'Corrupt', maybeName } as const)),
)

const products: fc.Arbitrary<State['products']> = fc.oneof(
  fc.constant({ _tag: 'Loading' } as const),
  fc.constant({ _tag: 'Failed' } as const),
  fc.array(product, { maxLength: 8 }).map((items) => ({ _tag: 'Loaded', items } as const)),
)

const selecting = maybe(NonEmptyHashSet.arbitrary(id)).map((maybeIds) => ({ _tag: 'Selecting', maybeIds } as const))
const deleting = fc.record({ operation, ids: NonEmptyHashSet.arbitrary(id) }).map((fields) => (
  { _tag: 'Deleting', ...fields } as const
))
const selection: fc.Arbitrary<State['selection']> = fc.oneof(selecting, deleting)

const formFields = fc.record({ maybeName: maybe(fc.string()), maybeExpirationDate: maybe(date) })
const closedForm = fc.constant({ _tag: 'Closed' } as const)
const editingForm = formFields.map((fields) => ({ _tag: 'Editing', ...fields } as const))
const submittingForm = fc.tuple(formFields, operation).map(([fields, operation]) => (
  { _tag: 'Submitting', operation, ...fields } as const
))
const addProduct: fc.Arbitrary<State['addProduct']> = fc.oneof(closedForm, editingForm, submittingForm)

const state: fc.Arbitrary<State> = fc.record({
  isMenuOpen: fc.boolean(),
  isViewportAtTop: fc.boolean(),
  isInteracting: fc.boolean(),
  nextOperation,
  latestValidation: maybe(operation),
  products,
  selection,
  addProduct,
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
  fc.record({ operation, succeeded: fc.boolean() }).map(InternalMessage.AddProductCompleted),
  fc.oneof(
    fc.constant(Result.fail(undefined)),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => InternalMessage.ProductsChanged({ result })),
  fc.record({ validation: operation, result: validatedResult }).map(InternalMessage.ProductsValidated),
  fc.record({ operation, succeeded: fc.boolean() }).map(InternalMessage.DeleteProductsCompleted),
  fc.constant(InternalMessage.NoOp()),
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Outcome =
  | Readonly<{ rejected: true }>
  | Readonly<{ rejected: false; after: State; commands: ReadonlyArray<unknown> }>

const outcome = (msg: InternalMessage, before: State): Outcome => {
  const result = update(msg)(before)
  return Engine.isRejected(result)
    ? { rejected: true }
    : { rejected: false, after: result.state, commands: result.commands ?? [] }
}

const rejects = (msg: InternalMessage, before: State) => outcome(msg, before).rejected

/** The outcome of a message that must be accepted: a rejection fails the property. */
const step = (msg: InternalMessage, before: State) => {
  const result = outcome(msg, before)
  if (result.rejected) {
    throw new Error(`update rejected ${msg._tag}`)
  }
  return result
}

/**
 * Renders the real view for `state` and fires every event handler in the tree,
 * with a fake event whose target holds `inputValue`. Returns the messages the
 * handlers dispatch. Hooks are not run: they only touch the DOM.
 */
const dispatchedByView = (before: State, inputValue: string): ReadonlyArray<InternalMessage> => {
  const dispatched: Array<InternalMessage> = []
  const visit = (node: VNode | string | undefined): void => {
    if (node === undefined || typeof node === 'string') return
    for (const [type, handler] of Object.entries(node.data?.on ?? {})) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const event = { type, target: { value: inputValue } } as unknown as Event
      if (typeof handler === 'function') {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        ;(handler as (this: VNode, event: Event, vnode: VNode) => void).call(node, event, node)
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(view(makeModel(before), (message) => dispatched.push(message)))
  return dispatched
}

/** `after` equals `before` except, at most, for the given top-level keys. */
const onlyChanged = (before: State, after: State, ...keys: ReadonlyArray<keyof State>) =>
  Equal.equals(after, { ...before, ...Object.fromEntries(keys.map((key) => [key, after[key]])) })

const selectedIds = (selection: State['selection']) =>
  selection._tag === 'Deleting'
    ? HashSet.fromIterable(selection.ids)
    : Opt.match(selection.maybeIds, { onNone: () => HashSet.empty<string>(), onSome: HashSet.fromIterable })

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
        outcome(msg, before)
        return true
      })
    })

    test('is deterministic', () => {
      assertProperty([state, message], (before, msg) => {
        const first = outcome(msg, before)
        const second = outcome(msg, before)
        return first.rejected || second.rejected
          ? first.rejected === second.rejected
          : Equal.equals(first.after, second.after) && first.commands.length === second.commands.length
      })
    })

    test('only messages that start an operation take a new operation id, one at a time', () => {
      const starters = new Set(['AddProductStarted', 'DeleteStarted', 'ProductsChanged'])
      assertProperty([state, message], (before, msg) => {
        const result = outcome(msg, before)
        if (result.rejected) return true
        const expected = starters.has(msg._tag) ? before.nextOperation + 1 : before.nextOperation
        return result.after.nextOperation === expected
      })
    })
  })

  // Guarantees that the view never dispatches, from the state it was rendered
  // from, a message that `update` rejects. That is what lets the engine treat
  // such a rejection as a bug and crash.
  describe('view and update agree', () => {
    test('every message the view can dispatch is accepted', () => {
      assertProperty([state, fc.string()], (before, inputValue) =>
        dispatchedByView(before, inputValue).every((msg) => !rejects(msg, before)))
    })

    // Guards against the property passing only because the view dispatches
    // nothing interesting: at least one message that `update` can reject must
    // be reachable from the view.
    test('the view reaches messages that update can reject', () => {
      const tags = new Set(fc.sample(state, 1_000).flatMap((s) => dispatchedByView(s, '').map((msg) => msg._tag)))
      expect(tags.has('AddProductStarted')).toBe(true)
      expect(tags.has('NameChanged')).toBe(true)
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
    test('starts a validation with a new id, which becomes the latest', () => {
      assertProperty([state, message.filter((msg) => msg._tag === 'ProductsChanged')], (before, msg) => {
        const { after, commands } = step(msg, before)
        return Equal.equals(after.latestValidation, Opt.some(before.nextOperation))
          && onlyChanged(before, after, 'latestValidation', 'nextOperation')
          && commands.length === 1
      })
    })
  })

  describe('ProductsValidated', () => {
    // A state whose latest validation is `validation`, so that its result applies.
    const awaiting = fc.tuple(state, operation).map(([base, validation]) => ({
      before: { ...base, latestValidation: Opt.some(validation) } satisfies State,
      validation,
    }))

    const validated = (validation: OperationId, products: Arr.NonEmptyReadonlyArray<ValidatedProduct>) =>
      InternalMessage.ProductsValidated({ validation, result: Result.succeed(Opt.some(products)) })

    test('is rejected unless it is the latest validation', () => {
      assertProperty([state, operation, validatedResult], (before, validation, result) => {
        fc.pre(!Opt.contains(before.latestValidation, validation))
        return rejects(InternalMessage.ProductsValidated({ validation, result }), before)
      })
    })

    test('a failure marks the products as failed and touches nothing else', () => {
      assertProperty([awaiting], ({ before, validation }) => {
        const { after } = step(InternalMessage.ProductsValidated({ validation, result: Result.fail(undefined) }), before)
        return after.products._tag === 'Failed' && onlyChanged(before, after, 'products')
      })
    })

    test('no products means an empty list', () => {
      assertProperty([awaiting], ({ before, validation }) => {
        const { after } = step(InternalMessage.ProductsValidated({ validation, result: Result.succeed(Opt.none()) }), before)
        return Equal.equals(after.products, { _tag: 'Loaded', items: [] })
      })
    })

    test('products are stored in order; invalid ones keep their id when they have one', () => {
      assertProperty([awaiting, NonEmptyArray.arbitrary(validatedProduct)], ({ before, validation }, products) => {
        const after = step(validated(validation, products), before).after
        return after.products._tag === 'Loaded'
          && after.products.items.length === products.length
          && products.every((product, index) => {
            const stored = after.products._tag === 'Loaded' ? after.products.items[index] : undefined
            if (product._tag === 'Valid') return stored?._tag === 'Valid' && stored.id === product.id
            return Opt.match(product.maybeId, {
              onNone: () => stored?._tag === 'Corrupt',
              onSome: (id) => stored?._tag === 'Invalid' && stored.id === id,
            })
          })
          && onlyChanged(before, after, 'products', 'selection')
      })
    })

    test('the selection keeps exactly the selected products that still exist; a deletion is left alone', () => {
      assertProperty([awaiting, NonEmptyArray.arbitrary(validatedProduct)], ({ before, validation }, products) => {
        const after = step(validated(validation, products), before).after
        if (before.selection._tag === 'Deleting') {
          return Equal.equals(after.selection, before.selection)
        }
        const existingIds = HashSet.fromIterable(
          products.flatMap((product) => (product._tag === 'Valid' ? [product.id] : Opt.toArray(product.maybeId))),
        )
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), HashSet.intersection(selectedIds(before.selection), existingIds))
      })
    })
  })

  describe('ItemToggled', () => {
    const toggleable = fc.tuple(state, fc.array(product, { maxLength: 8 }), selecting).map(
      ([base, items, selection]): State => ({ ...base, products: { _tag: 'Loaded', items }, selection }),
    )

    test('toggles membership of the id in the selection', () => {
      assertProperty([toggleable, id], (before, itemId) => {
        const { after, commands } = step(InternalMessage.ItemToggled({ id: itemId }), before)
        return HashSet.has(selectedIds(after.selection), itemId) === !HashSet.has(selectedIds(before.selection), itemId)
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('toggling twice restores the state', () => {
      assertProperty([toggleable, id], (before, itemId) => {
        const msg = InternalMessage.ItemToggled({ id: itemId })
        return Equal.equals(step(msg, step(msg, before).after).after, before)
      })
    })

    test('is rejected unless the products are shown and nothing is being deleted', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(before.products._tag !== 'Loaded' || before.selection._tag !== 'Selecting')
        return rejects(InternalMessage.ItemToggled({ id: itemId }), before)
      })
    })
  })

  describe('ClearSelected', () => {
    test('empties the selection, or is rejected when there is nothing to clear', () => {
      assertProperty([state], (before) => {
        const canClear = before.selection._tag === 'Selecting' && Opt.isSome(before.selection.maybeIds)
        if (!canClear) {
          return rejects(InternalMessage.ClearSelected(), before)
        }
        const { after, commands } = step(InternalMessage.ClearSelected(), before)
        return Equal.equals(after.selection, { _tag: 'Selecting', maybeIds: Opt.none() })
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })
  })

  describe('DeleteStarted', () => {
    test('deletes the selection as a new operation, or is rejected', () => {
      assertProperty([state], (before) => {
        const canDelete = before.products._tag === 'Loaded'
          && before.selection._tag === 'Selecting'
          && Opt.isSome(before.selection.maybeIds)
        if (!canDelete) {
          return rejects(InternalMessage.DeleteStarted(), before)
        }
        const { after, commands } = step(InternalMessage.DeleteStarted(), before)
        return after.selection._tag === 'Deleting'
          && after.selection.operation === before.nextOperation
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && after.nextOperation === before.nextOperation + 1
          && onlyChanged(before, after, 'selection', 'nextOperation')
          && commands.length === 1
      })
    })
  })

  describe('DeleteProductsCompleted', () => {
    const deletingState = stateWith('selection', deleting)

    test('success clears the selection', () => {
      assertProperty([deletingState], (before) => {
        fc.pre(before.selection._tag === 'Deleting')
        const operation = before.selection.operation
        const { after, commands } = step(InternalMessage.DeleteProductsCompleted({ operation, succeeded: true }), before)
        return Equal.equals(after.selection, { _tag: 'Selecting', maybeIds: Opt.none() })
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('failure gives the selection back and warns the user', () => {
      assertProperty([deletingState], (before) => {
        fc.pre(before.selection._tag === 'Deleting')
        const operation = before.selection.operation
        const { after, commands } = step(InternalMessage.DeleteProductsCompleted({ operation, succeeded: false }), before)
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && onlyChanged(before, after, 'selection')
          && commands.length === 1
      })
    })

    test('is rejected unless it completes the deletion in progress', () => {
      assertProperty([state, operation, fc.boolean()], (before, operation, succeeded) => {
        fc.pre(before.selection._tag !== 'Deleting' || before.selection.operation !== operation)
        return rejects(InternalMessage.DeleteProductsCompleted({ operation, succeeded }), before)
      })
    })
  })

  describe('AddProductToggled', () => {
    test('opens an empty form, closes an edited one, and leaves a submission alone', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(InternalMessage.AddProductToggled(), before)
        const expected = {
          Closed: () =>
            Equal.equals(after.addProduct, { _tag: 'Editing', maybeName: Opt.none(), maybeExpirationDate: Opt.none() }),
          Editing: () => after.addProduct._tag === 'Closed',
          Submitting: () => Equal.equals(after.addProduct, before.addProduct),
        }[before.addProduct._tag]()
        return expected && onlyChanged(before, after, 'addProduct') && commands.length === 0
      })
    })
  })

  describe('NameChanged', () => {
    test('stores the name as typed while editing', () => {
      assertProperty([stateWith('addProduct', editingForm), fc.string()], (before, name) => {
        const { after } = step(InternalMessage.NameChanged({ name }), before)
        return after.addProduct._tag === 'Editing'
          && Equal.equals(after.addProduct.maybeName, Opt.some(name))
          && onlyChanged(before, after, 'addProduct')
      })
    })

    test('changes nothing while submitting', () => {
      assertProperty([stateWith('addProduct', submittingForm), fc.string()], (before, name) =>
        Equal.equals(step(InternalMessage.NameChanged({ name }), before).after, before))
    })

    test('is rejected when the form is closed', () => {
      assertProperty([stateWith('addProduct', closedForm), fc.string()], (before, name) =>
        rejects(InternalMessage.NameChanged({ name }), before))
    })
  })

  describe('ExpirationDateChanged', () => {
    test('stores the parsed date while editing', () => {
      assertProperty([stateWith('addProduct', editingForm), fc.oneof(fc.string(), fc.integer())], (
        before,
        expiration,
      ) => {
        const { after } = step(InternalMessage.ExpirationDateChanged({ expiration }), before)
        return after.addProduct._tag === 'Editing'
          && Equal.equals(after.addProduct.maybeExpirationDate, DateTime.make(expiration))
          && onlyChanged(before, after, 'addProduct')
      })
    })

    test('changes nothing while submitting', () => {
      assertProperty([stateWith('addProduct', submittingForm), fc.integer()], (before, expiration) =>
        Equal.equals(step(InternalMessage.ExpirationDateChanged({ expiration }), before).after, before))
    })

    test('is rejected when the form is closed', () => {
      assertProperty([stateWith('addProduct', closedForm), fc.integer()], (before, expiration) =>
        rejects(InternalMessage.ExpirationDateChanged({ expiration }), before))
    })
  })

  describe('AddProductStarted', () => {
    test('submits a form with a non-blank name as a new operation, or is rejected', () => {
      assertProperty([state], (before) => {
        const form = before.addProduct
        const canStart = form._tag === 'Editing'
          && Opt.exists(form.maybeName, (name) => name.normalize('NFKC').trim().length > 0)
        if (!canStart) {
          return rejects(InternalMessage.AddProductStarted(), before)
        }
        const { after, commands } = step(InternalMessage.AddProductStarted(), before)
        return Equal.equals(after.addProduct, {
          _tag: 'Submitting',
          operation: before.nextOperation,
          maybeName: form.maybeName,
          maybeExpirationDate: form.maybeExpirationDate,
        })
          && after.nextOperation === before.nextOperation + 1
          && onlyChanged(before, after, 'addProduct', 'nextOperation')
          && commands.length === 1
      })
    })
  })

  describe('AddProductCompleted', () => {
    const submittingState = stateWith('addProduct', submittingForm)

    test('success closes the form', () => {
      assertProperty([submittingState], (before) => {
        fc.pre(before.addProduct._tag === 'Submitting')
        const operation = before.addProduct.operation
        const { after, commands } = step(InternalMessage.AddProductCompleted({ operation, succeeded: true }), before)
        return after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && commands.length === 0
      })
    })

    test('failure gives the form back, as it was, and warns the user', () => {
      assertProperty([submittingState], (before) => {
        fc.pre(before.addProduct._tag === 'Submitting')
        const { operation, maybeName, maybeExpirationDate } = before.addProduct
        const { after, commands } = step(InternalMessage.AddProductCompleted({ operation, succeeded: false }), before)
        return Equal.equals(after.addProduct, { _tag: 'Editing', maybeName, maybeExpirationDate })
          && onlyChanged(before, after, 'addProduct')
          && commands.length === 1
      })
    })

    test('is rejected unless it completes the submission in progress', () => {
      assertProperty([state, operation, fc.boolean()], (before, operation, succeeded) => {
        fc.pre(before.addProduct._tag !== 'Submitting' || before.addProduct.operation !== operation)
        return rejects(InternalMessage.AddProductCompleted({ operation, succeeded }), before)
      })
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every variant of the state', () => {
  const tags = new Set(
    fc.sample(state, 500).flatMap((s) => [s.products._tag, s.selection._tag, s.addProduct._tag]),
  )
  expect([...tags].sort()).toEqual(['Closed', 'Deleting', 'Editing', 'Failed', 'Loaded', 'Loading', 'Selecting', 'Submitting'])
})
