import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as Tea from '@fgaudo/effect-tea'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import { dispatchedBy } from '@/libs/testing/view.test-support.ts'
import * as Domain from '../../../domain/product.ts'
import type { StoredProduct } from '../ports/product-list.ts'
import { view } from '../view.tsx'
import { Event, Message } from './messages.ts'
import { makeModel } from './model.ts'
import {
  closedForm,
  date,
  deleting,
  editingForm,
  id,
  product,
  selecting,
  state,
  stateWith,
  storedProducts,
  submittingForm,
} from './state.test-arbitrary.ts'
import type { State } from './state.ts'
import { update } from './update.ts'

const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Message.DeleteStarted()),
  id.map((id) => Message.ItemSelected({ id })),
  id.map((id) => Message.ItemDeselected({ id })),
  fc.constant(Message.ClearSelected()),
  fc.constant(Message.MenuOpened()),
  fc.constant(Message.MenuClosed()),
  fc.constant(Message.AddProductOpened()),
  fc.constant(Message.AddProductClosed()),
  fc.constant(Message.AddProductStarted()),
  fc.boolean().map((isAtTop) => Message.ViewportAtTopChanged({ isAtTop })),
  fc.boolean().map((isCloseToTop) => Message.ViewportCloseToTopChanged({ isCloseToTop })),
  fc.boolean().map((isInteracting) => Message.InteractionChanged({ isInteracting })),
  fc.string().map((name) => Message.NameChanged({ name })),
  fc.oneof(fc.string(), fc.integer()).map((expiration) => Message.ExpirationDateChanged({ expiration })),
  date.map((now) => Message.TimeChanged({ now })),
  fc.boolean().map((succeeded) => Message.AddProductCompleted({ succeeded })),
  fc.oneof(
    fc.constant(Result.fail(undefined)),
    storedProducts.map((products) => Result.succeed(products)),
  ).map((result) => Message.ProductsChanged({ result })),
  fc.boolean().map((succeeded) => Message.DeleteProductsCompleted({ succeeded })),
  fc.constant(Message.InfoRequested()),
  fc.constant(Message.BackPressed()),
)

type Outcome =
  | Readonly<{ rejected: true }>
  | Readonly<{ rejected: false; after: State; commands: ReadonlyArray<unknown>; events: ReadonlyArray<Event> }>

const outcome = (msg: Message, before: State): Outcome => {
  const result = update(msg)(before)
  return Tea.isRejected(result)
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
  })

  describe('view and update agree', () => {
    // Every message the view can dispatch is accepted in the state it was
    // rendered from, which is what lets the engine treat such a rejection as a
    // bug; and sent twice from the same frame (a double tap, or a tap on a view
    // that has not caught up yet), it acts once. No action of this page is meant
    // to repeat.
    test('every message the view can dispatch is accepted, and acts once when sent twice', () => {
      const check = dispatchViolations(update)
      fc.assert(fc.property(state, fc.string(), (before, inputValue) => {
        expect(check(before, dispatchedBy(view, makeModel(before), inputValue))).toEqual([])
      }))
    })

    // Guards against the property passing only because the view dispatches
    // nothing interesting: at least one message that `update` can reject must
    // be reachable from the view.
    test('the view reaches messages that update can reject', () => {
      const tags = new Set(
        fc.sample(state, 1_000).flatMap((s) => dispatchedBy(view, makeModel(s)).map((msg) => msg._tag)),
      )
      const expected: ReadonlyArray<Message['_tag']> = [
        'AddProductStarted',
        'NameChanged',
        'MenuOpened',
        'MenuClosed',
        'AddProductOpened',
        'AddProductClosed',
        'ItemSelected',
        'ItemDeselected',
      ]
      for (const tag of expected) {
        expect(tags.has(tag)).toBe(true)
      }
    })
  })

  describe('InfoRequested', () => {
    test('closes the menu and asks the parent for the info page, or is rejected when the menu is closed', () => {
      assertProperty([state], (before) => {
        if (!before.isMenuOpen) {
          return rejects(Message.InfoRequested(), before)
        }
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
          Editing: () =>
            after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && events.length === 0,
          Submitting: () => Equal.equals(after, before) && events.length === 0,
          Closed: () => Equal.equals(after, before) && Equal.equals(events, [Event.LeaveRequested()]),
        }[before.addProduct._tag]()
        return expected && commands.length === 0
      })
    })
  })

  describe('MenuOpened and MenuClosed', () => {
    const cases = [
      { msg: Message.MenuOpened(), isOpenBefore: false },
      { msg: Message.MenuClosed(), isOpenBefore: true },
    ] as const

    test('open a closed menu, close an open one, and touch nothing else', () => {
      assertProperty([state], (before) =>
        cases.every(({ msg, isOpenBefore }) => {
          const from = { ...before, isMenuOpen: isOpenBefore }
          const { after, commands } = step(msg, from)
          return after.isMenuOpen === !isOpenBefore && onlyChanged(from, after, 'isMenuOpen') && commands.length === 0
        }))
    })

    test('are rejected when the menu is already in the state they ask for', () => {
      assertProperty(
        [state],
        (before) => cases.every(({ msg, isOpenBefore }) => rejects(msg, { ...before, isMenuOpen: !isOpenBefore })),
      )
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
          && Equal.equals(
            selectedIds(after.selection),
            HashSet.intersection(selectedIds(before.selection), existingIds),
          )
      })
    })
  })

  describe('ItemSelected and ItemDeselected', () => {
    const changeable = fc.tuple(state, fc.array(product, { maxLength: 8 }), selecting).map(
      ([base, items, selection]): State => ({ ...base, products: { _tag: 'Loaded', items }, selection }),
    )

    test('select an unselected id, deselect a selected one, and touch nothing else', () => {
      assertProperty([changeable, id], (before, itemId) => {
        const wasSelected = HashSet.has(selectedIds(before.selection), itemId)
        const msg = wasSelected ? Message.ItemDeselected({ id: itemId }) : Message.ItemSelected({ id: itemId })
        const { after, commands } = step(msg, before)
        return HashSet.has(selectedIds(after.selection), itemId) === !wasSelected
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('selecting then deselecting restores the state', () => {
      assertProperty([changeable, id], (before, itemId) => {
        fc.pre(!HashSet.has(selectedIds(before.selection), itemId))
        const selected = step(Message.ItemSelected({ id: itemId }), before).after
        return Equal.equals(step(Message.ItemDeselected({ id: itemId }), selected).after, before)
      })
    })

    test('are rejected when the id is already in the state they ask for', () => {
      assertProperty([changeable, id], (before, itemId) =>
        HashSet.has(selectedIds(before.selection), itemId)
          ? rejects(Message.ItemSelected({ id: itemId }), before)
          : rejects(Message.ItemDeselected({ id: itemId }), before))
    })

    test('are rejected unless the products are shown and nothing is being deleted', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(before.products._tag !== 'Loaded' || before.selection._tag !== 'Selecting')
        return rejects(Message.ItemSelected({ id: itemId }), before)
          && rejects(Message.ItemDeselected({ id: itemId }), before)
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
    test('deletes the selection, or is rejected', () => {
      assertProperty([state], (before) => {
        const canDelete = before.products._tag === 'Loaded'
          && before.selection._tag === 'Selecting'
          && Opt.isSome(before.selection.maybeIds)
        if (!canDelete) {
          return rejects(Message.DeleteStarted(), before)
        }
        const { after, commands } = step(Message.DeleteStarted(), before)
        return after.selection._tag === 'Deleting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && onlyChanged(before, after, 'selection')
          && commands.length === 1
      })
    })
  })

  describe('DeleteProductsCompleted', () => {
    const deletingState = stateWith('selection', deleting)

    test('success clears the selection', () => {
      assertProperty([deletingState], (before) => {
        fc.pre(before.selection._tag === 'Deleting')
        const { after, commands } = step(Message.DeleteProductsCompleted({ succeeded: true }), before)
        return Equal.equals(after.selection, { _tag: 'Selecting', maybeIds: Opt.none() })
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('failure gives the selection back and warns the user', () => {
      assertProperty([deletingState], (before) => {
        fc.pre(before.selection._tag === 'Deleting')
        const { after, commands } = step(Message.DeleteProductsCompleted({ succeeded: false }), before)
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && onlyChanged(before, after, 'selection')
          && commands.length === 1
      })
    })

    test('is rejected when no deletion is in progress', () => {
      assertProperty([state, fc.boolean()], (before, succeeded) => {
        fc.pre(before.selection._tag !== 'Deleting')
        return rejects(Message.DeleteProductsCompleted({ succeeded }), before)
      })
    })
  })

  describe('AddProductOpened', () => {
    test('opens an empty form, or is rejected when it is already open', () => {
      assertProperty([state], (before) => {
        if (before.addProduct._tag !== 'Closed') {
          return rejects(Message.AddProductOpened(), before)
        }
        const { after, commands } = step(Message.AddProductOpened(), before)
        return Equal.equals(after.addProduct, {
          _tag: 'Editing',
          maybeName: Opt.none(),
          maybeExpirationDate: Opt.none(),
        })
          && onlyChanged(before, after, 'addProduct')
          && commands.length === 0
      })
    })
  })

  describe('AddProductClosed', () => {
    test('closes an edited form, or is rejected when closed or submitting', () => {
      assertProperty([state], (before) => {
        if (before.addProduct._tag !== 'Editing') {
          return rejects(Message.AddProductClosed(), before)
        }
        const { after, commands } = step(Message.AddProductClosed(), before)
        return after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && commands.length === 0
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

    test('is rejected while submitting: the inputs are frozen', () => {
      assertProperty(
        [stateWith('addProduct', submittingForm), fc.string()],
        (before, name) => rejects(Message.NameChanged({ name }), before),
      )
    })

    test('is rejected when the form is closed', () => {
      assertProperty(
        [stateWith('addProduct', closedForm), fc.string()],
        (before, name) => rejects(Message.NameChanged({ name }), before),
      )
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

    test('is rejected while submitting: the inputs are frozen', () => {
      assertProperty(
        [stateWith('addProduct', submittingForm), fc.integer()],
        (before, expiration) => rejects(Message.ExpirationDateChanged({ expiration }), before),
      )
    })

    test('is rejected when the form is closed', () => {
      assertProperty(
        [stateWith('addProduct', closedForm), fc.integer()],
        (before, expiration) => rejects(Message.ExpirationDateChanged({ expiration }), before),
      )
    })
  })

  describe('AddProductStarted', () => {
    test('submits a form with a non-blank name, or is rejected', () => {
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
          maybeName: form.maybeName,
          maybeExpirationDate: form.maybeExpirationDate,
        })
          && onlyChanged(before, after, 'addProduct')
          && commands.length === 1
      })
    })
  })

  describe('AddProductCompleted', () => {
    const submittingState = stateWith('addProduct', submittingForm)

    test('success closes the form', () => {
      assertProperty([submittingState], (before) => {
        fc.pre(before.addProduct._tag === 'Submitting')
        const { after, commands } = step(Message.AddProductCompleted({ succeeded: true }), before)
        return after.addProduct._tag === 'Closed' && onlyChanged(before, after, 'addProduct') && commands.length === 0
      })
    })

    test('failure gives the form back, as it was, and warns the user', () => {
      assertProperty([submittingState], (before) => {
        fc.pre(before.addProduct._tag === 'Submitting')
        const { maybeName, maybeExpirationDate } = before.addProduct
        const { after, commands } = step(Message.AddProductCompleted({ succeeded: false }), before)
        return Equal.equals(after.addProduct, { _tag: 'Editing', maybeName, maybeExpirationDate })
          && onlyChanged(before, after, 'addProduct')
          && commands.length === 1
      })
    })

    test('is rejected when no submission is in progress', () => {
      assertProperty([state, fc.boolean()], (before, succeeded) => {
        fc.pre(before.addProduct._tag !== 'Submitting')
        return rejects(Message.AddProductCompleted({ succeeded }), before)
      })
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every variant of the state', () => {
  const tags = new Set(
    fc.sample(state, 500).flatMap((s) => [s.products._tag, s.selection._tag, s.addProduct._tag]),
  )
  expect([...tags].sort()).toEqual([
    'Closed',
    'Deleting',
    'Editing',
    'Failed',
    'Loaded',
    'Loading',
    'Selecting',
    'Submitting',
  ])
})
