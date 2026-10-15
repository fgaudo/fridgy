import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import type { VNode } from 'snabbdom'
import * as Engine from '@/libs/elm/engine.ts'
import * as Domain from '../domain/product.ts'
import type { StoredProduct } from '../ports/products.ts'
import { view } from '../view.ts'
import { Event, Message } from './messages.ts'
import { makeModel } from './model.ts'
import {
  closedForm,
  date,
  deleting,
  editingForm,
  id,
  operation,
  product,
  selecting,
  state,
  stateWith,
  storedProducts,
  submittingForm,
} from './state.arbitrary.ts'
import type { State } from './state.ts'
import { update } from './update.ts'

const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Message.DeleteStarted()),
  id.map((id) => Message.ItemToggled({ id })),
  fc.constant(Message.ClearSelected()),
  fc.constant(Message.MenuToggled()),
  fc.constant(Message.AddProductToggled()),
  fc.constant(Message.AddProductStarted()),
  fc.boolean().map((isAtTop) => Message.ViewportAtTopChanged({ isAtTop })),
  fc.boolean().map((isCloseToTop) => Message.ViewportCloseToTopChanged({ isCloseToTop })),
  fc.boolean().map((isInteracting) => Message.InteractionChanged({ isInteracting })),
  fc.string().map((name) => Message.NameChanged({ name })),
  fc.oneof(fc.string(), fc.integer()).map((expiration) => Message.ExpirationDateChanged({ expiration })),
  date.map((now) => Message.TimeChanged({ now })),
  fc.record({ operation, succeeded: fc.boolean() }).map(Message.AddProductCompleted),
  fc.oneof(
    fc.constant(Result.fail(undefined)),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => Message.ProductsChanged({ result })),
  fc.record({ operation, succeeded: fc.boolean() }).map(Message.DeleteProductsCompleted),
  fc.constant(Message.InfoRequested()),
  fc.constant(Message.BackPressed()),
)

type Outcome =
  | Readonly<{ rejected: true }>
  | Readonly<{ rejected: false; after: State; commands: ReadonlyArray<unknown>; events: ReadonlyArray<Event> }>

const outcome = (msg: Message, before: State): Outcome => {
  const result = update(msg)(before)
  return Engine.isRejected(result)
    ? { rejected: true }
    : { rejected: false, after: result.state, commands: result.commands ?? [], events: result.events ?? [] }
}

const rejects = (msg: Message, before: State) => outcome(msg, before).rejected

const step = (msg: Message, before: State) => {
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
const dispatchedByView = (before: State, inputValue: string): ReadonlyArray<Message> => {
  const dispatched: Array<Message> = []
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
      const starters = new Set(['AddProductStarted', 'DeleteStarted'])
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

  describe('InfoRequested', () => {
    test('closes the menu and asks the parent for the info page', () => {
      assertProperty([state], (before) => {
        const { after, commands, events } = step(Message.InfoRequested(), before)
        return !after.isMenuOpen
          && onlyChanged(before, after, 'isMenuOpen')
          && commands.length === 0
          && Equal.equals(events, [Event.InfoRequested()])
      })
    })
  })

  describe('BackPressed', () => {
    test('closes the menu first, then an edited form, and otherwise asks to leave', () => {
      assertProperty([state], (before) => {
        const { after, commands, events } = step(Message.BackPressed(), before)
        if (before.isMenuOpen) {
          return !after.isMenuOpen && onlyChanged(before, after, 'isMenuOpen') && events.length === 0
        }
        const expected = {
          Editing: () => after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && events.length === 0,
          Submitting: () => Equal.equals(after, before) && events.length === 0,
          Closed: () => Equal.equals(after, before) && Equal.equals(events, [Event.LeaveRequested()]),
        }[before.addProduct._tag]()
        return expected && commands.length === 0
      })
    })
  })

  describe('MenuToggled', () => {
    test('flips the menu and touches nothing else', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(Message.MenuToggled(), before)
        return after.isMenuOpen === !before.isMenuOpen
          && onlyChanged(before, after, 'isMenuOpen')
          && commands.length === 0
      })
    })

    test('toggling twice restores the state', () => {
      assertProperty([state], (before) => {
        const once = step(Message.MenuToggled(), before).after
        return Equal.equals(step(Message.MenuToggled(), once).after, before)
      })
    })
  })

  describe('InteractionChanged', () => {
    test('stores the flag, is idempotent and touches nothing else', () => {
      assertProperty([state, fc.boolean()], (before, isInteracting) => {
        const msg = Message.InteractionChanged({ isInteracting })
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
        const { after, commands } = step(Message.ViewportAtTopChanged({ isAtTop }), before)
        return after.isViewportAtTop === isAtTop
          && onlyChanged(before, after, 'isViewportAtTop')
          && commands.length === 0
      })
    })
  })

  describe('ViewportCloseToTopChanged', () => {
    test('scrolls to the top only when close to it and not interacting', () => {
      assertProperty([state, fc.boolean()], (before, isCloseToTop) => {
        const { after, commands } = step(Message.ViewportCloseToTopChanged({ isCloseToTop }), before)
        const shouldScroll = isCloseToTop && !before.isInteracting
        return Equal.equals(after, before) && commands.length === (shouldScroll ? 1 : 0)
      })
    })
  })

  describe('TimeChanged', () => {
    test('stores the time and touches nothing else', () => {
      assertProperty([state, date], (before, now) => {
        const { after, commands } = step(Message.TimeChanged({ now }), before)
        return Equal.equals(after.maybeNow, Opt.some(now))
          && onlyChanged(before, after, 'maybeNow')
          && commands.length === 0
      })
    })
  })

  describe('ProductsChanged', () => {
    const changed = (products: ReadonlyArray<StoredProduct>) =>
      Message.ProductsChanged({ result: Result.succeed(products) })

    test('a failure marks the products as failed and touches nothing else', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(Message.ProductsChanged({ result: Result.fail(undefined) }), before)
        return after.products._tag === 'Failed' && onlyChanged(before, after, 'products') && commands.length === 0
      })
    })

    test('products are validated in order, without commands', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after, commands } = step(changed(stored), before)
        return after.products._tag === 'Loaded'
          && after.products.items.length === stored.length
          && stored.every((input, index) => {
            const item = after.products._tag === 'Loaded' ? after.products.items[index] : undefined
            return Opt.match(input.maybeId, {
              onNone: () => item?._tag === 'Corrupt',
              onSome: (id) =>
                Opt.match(Domain.fromSnapshot(input), {
                  onNone: () => item?._tag === 'Invalid' && item.id === id,
                  onSome: (validated) =>
                    item?._tag === 'Valid' && item.id === id && Equal.equals(item.product, validated),
                }),
            })
          })
          && onlyChanged(before, after, 'products', 'selection')
          && commands.length === 0
      })
    })

    test('the selection keeps exactly the selected products that still exist; a deletion is left alone', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        if (before.selection._tag === 'Deleting') {
          return Equal.equals(after.selection, before.selection)
        }
        const existingIds = HashSet.fromIterable(stored.flatMap((input) => Opt.toArray(input.maybeId)))
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
        const { after, commands } = step(Message.ItemToggled({ id: itemId }), before)
        return HashSet.has(selectedIds(after.selection), itemId) === !HashSet.has(selectedIds(before.selection), itemId)
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('toggling twice restores the state', () => {
      assertProperty([toggleable, id], (before, itemId) => {
        const msg = Message.ItemToggled({ id: itemId })
        return Equal.equals(step(msg, step(msg, before).after).after, before)
      })
    })

    test('is rejected unless the products are shown and nothing is being deleted', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(before.products._tag !== 'Loaded' || before.selection._tag !== 'Selecting')
        return rejects(Message.ItemToggled({ id: itemId }), before)
      })
    })
  })

  describe('ClearSelected', () => {
    test('empties the selection, or is rejected when there is nothing to clear', () => {
      assertProperty([state], (before) => {
        const canClear = before.selection._tag === 'Selecting' && Opt.isSome(before.selection.maybeIds)
        if (!canClear) {
          return rejects(Message.ClearSelected(), before)
        }
        const { after, commands } = step(Message.ClearSelected(), before)
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
          return rejects(Message.DeleteStarted(), before)
        }
        const { after, commands } = step(Message.DeleteStarted(), before)
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
        const { after, commands } = step(Message.DeleteProductsCompleted({ operation, succeeded: true }), before)
        return Equal.equals(after.selection, { _tag: 'Selecting', maybeIds: Opt.none() })
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('failure gives the selection back and warns the user', () => {
      assertProperty([deletingState], (before) => {
        fc.pre(before.selection._tag === 'Deleting')
        const operation = before.selection.operation
        const { after, commands } = step(Message.DeleteProductsCompleted({ operation, succeeded: false }), before)
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && onlyChanged(before, after, 'selection')
          && commands.length === 1
      })
    })

    test('is rejected unless it completes the deletion in progress', () => {
      assertProperty([state, operation, fc.boolean()], (before, operation, succeeded) => {
        fc.pre(before.selection._tag !== 'Deleting' || before.selection.operation !== operation)
        return rejects(Message.DeleteProductsCompleted({ operation, succeeded }), before)
      })
    })
  })

  describe('AddProductToggled', () => {
    test('opens an empty form, closes an edited one, and leaves a submission alone', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(Message.AddProductToggled(), before)
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
        const { after } = step(Message.NameChanged({ name }), before)
        return after.addProduct._tag === 'Editing'
          && Equal.equals(after.addProduct.maybeName, Opt.some(name))
          && onlyChanged(before, after, 'addProduct')
      })
    })

    test('changes nothing while submitting', () => {
      assertProperty([stateWith('addProduct', submittingForm), fc.string()], (before, name) =>
        Equal.equals(step(Message.NameChanged({ name }), before).after, before))
    })

    test('is rejected when the form is closed', () => {
      assertProperty([stateWith('addProduct', closedForm), fc.string()], (before, name) =>
        rejects(Message.NameChanged({ name }), before))
    })
  })

  describe('ExpirationDateChanged', () => {
    test('stores the parsed date while editing', () => {
      assertProperty([stateWith('addProduct', editingForm), fc.oneof(fc.string(), fc.integer())], (
        before,
        expiration,
      ) => {
        const { after } = step(Message.ExpirationDateChanged({ expiration }), before)
        return after.addProduct._tag === 'Editing'
          && Equal.equals(after.addProduct.maybeExpirationDate, DateTime.make(expiration))
          && onlyChanged(before, after, 'addProduct')
      })
    })

    test('changes nothing while submitting', () => {
      assertProperty([stateWith('addProduct', submittingForm), fc.integer()], (before, expiration) =>
        Equal.equals(step(Message.ExpirationDateChanged({ expiration }), before).after, before))
    })

    test('is rejected when the form is closed', () => {
      assertProperty([stateWith('addProduct', closedForm), fc.integer()], (before, expiration) =>
        rejects(Message.ExpirationDateChanged({ expiration }), before))
    })
  })

  describe('AddProductStarted', () => {
    test('submits a form with a non-blank name as a new operation, or is rejected', () => {
      assertProperty([state], (before) => {
        const form = before.addProduct
        const canStart = form._tag === 'Editing'
          && Opt.exists(form.maybeName, (name) => name.normalize('NFKC').trim().length > 0)
        if (!canStart) {
          return rejects(Message.AddProductStarted(), before)
        }
        const { after, commands } = step(Message.AddProductStarted(), before)
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
        const { after, commands } = step(Message.AddProductCompleted({ operation, succeeded: true }), before)
        return after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && commands.length === 0
      })
    })

    test('failure gives the form back, as it was, and warns the user', () => {
      assertProperty([submittingState], (before) => {
        fc.pre(before.addProduct._tag === 'Submitting')
        const { operation, maybeName, maybeExpirationDate } = before.addProduct
        const { after, commands } = step(Message.AddProductCompleted({ operation, succeeded: false }), before)
        return Equal.equals(after.addProduct, { _tag: 'Editing', maybeName, maybeExpirationDate })
          && onlyChanged(before, after, 'addProduct')
          && commands.length === 1
      })
    })

    test('is rejected unless it completes the submission in progress', () => {
      assertProperty([state, operation, fc.boolean()], (before, operation, succeeded) => {
        fc.pre(before.addProduct._tag !== 'Submitting' || before.addProduct.operation !== operation)
        return rejects(Message.AddProductCompleted({ operation, succeeded }), before)
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
