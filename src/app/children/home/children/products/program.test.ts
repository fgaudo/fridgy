import { describe, expect, test } from 'bun:test'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as Domain from '#domain/product.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import type { StoredProduct } from './services/product-list/product-list.ts'
import { type Command, type Message, program, type State } from './program.ts'
import {
  deleting,
  id,
  message,
  product,
  selecting,
  state,
  stateWith,
  storedProducts,
} from './program.test_arbitrary.ts'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()

const { outcome, rejects, step } = outcomesOf(program.update)

const selectedIds = (selection: State['selection']) =>
  selection._tag === 'Deleting'
    ? HashSet.fromIterable(selection.ids)
    : Opt.match(selection.maybeIds, { onNone: () => HashSet.empty<string>(), onSome: HashSet.fromIterable })

/** A message that cannot arrive in that state: a completion while no deletion is in progress. */
const cannotArrive = (msg: Message, before: State) =>
  msg._tag === 'DeleteCompleted' && before.selection._tag !== 'Deleting'

describe('Products update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  test('TimeChanged stores the time and touches nothing else', () => {
    assertProperty([state, utc], (before, now) => {
      const { after, commands } = step(Msg.TimeChanged({ now }), before)
      return Equal.equals(after.maybeNow, Opt.some(now)) && onlyChanged(before, after, 'maybeNow')
        && commands.length === 0
    })
  })

  describe('ListChanged', () => {
    const changed = (products: ReadonlyArray<StoredProduct>) => Msg.ListChanged({ result: Result.succeed(products) })

    test('a failure marks the list as failed and touches nothing else', () => {
      assertProperty([state], (before) => {
        const { after, commands } = step(Msg.ListChanged({ result: Result.fail(undefined) }), before)
        return after.list._tag === 'Failed' && onlyChanged(before, after, 'list') && commands.length === 0
      })
    })

    test('products are validated in order, without commands', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after, commands } = step(changed(stored), before)
        return after.list._tag === 'Loaded'
          && after.list.items.length === stored.length
          && stored.every((input, index) => {
            const item = after.list._tag === 'Loaded' ? after.list.items[index] : undefined
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
          && onlyChanged(before, after, 'list', 'selection')
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
      ([base, items, selection]): State => ({ ...base, list: { _tag: 'Loaded', items }, selection }),
    )

    test('select an unselected id, deselect a selected one, and touch nothing else', () => {
      assertProperty([changeable, id], (before, itemId) => {
        const wasSelected = HashSet.has(selectedIds(before.selection), itemId)
        const msg = wasSelected ? Msg.ItemDeselected({ id: itemId }) : Msg.ItemSelected({ id: itemId })
        const { after, commands } = step(msg, before)
        return HashSet.has(selectedIds(after.selection), itemId) === !wasSelected
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('selecting then deselecting restores the state', () => {
      assertProperty([changeable, id], (before, itemId) => {
        fc.pre(!HashSet.has(selectedIds(before.selection), itemId))
        const selected = step(Msg.ItemSelected({ id: itemId }), before).after
        return Equal.equals(step(Msg.ItemDeselected({ id: itemId }), selected).after, before)
      })
    })

    test('are rejected when the id is already in the state they ask for', () => {
      assertProperty([changeable, id], (before, itemId) =>
        HashSet.has(selectedIds(before.selection), itemId)
          ? rejects(Msg.ItemSelected({ id: itemId }), before)
          : rejects(Msg.ItemDeselected({ id: itemId }), before))
    })

    test('are rejected unless the list is loaded and nothing is being deleted', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(before.list._tag !== 'Loaded' || before.selection._tag !== 'Selecting')
        return rejects(Msg.ItemSelected({ id: itemId }), before) && rejects(Msg.ItemDeselected({ id: itemId }), before)
      })
    })
  })

  test('SelectionCleared empties the selection, or is rejected when there is nothing to clear', () => {
    assertProperty([state], (before) => {
      const canClear = before.selection._tag === 'Selecting' && Opt.isSome(before.selection.maybeIds)
      if (!canClear) {
        return rejects(Msg.SelectionCleared(), before)
      }
      const { after, commands } = step(Msg.SelectionCleared(), before)
      return Equal.equals(after.selection, { _tag: 'Selecting', maybeIds: Opt.none() })
        && onlyChanged(before, after, 'selection')
        && commands.length === 0
    })
  })

  test('DeleteStarted deletes the selection, or is rejected', () => {
    assertProperty([state], (before) => {
      const canDelete = before.list._tag === 'Loaded'
        && before.selection._tag === 'Selecting'
        && Opt.isSome(before.selection.maybeIds)
      if (!canDelete) {
        return rejects(Msg.DeleteStarted(), before)
      }
      const { after, commands } = step(Msg.DeleteStarted(), before)
      return after.selection._tag === 'Deleting'
        && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
        && onlyChanged(before, after, 'selection')
        && Equal.equals(commands, [Cmd.Delete({ ids: before.selection.maybeIds.value })])
    })
  })

  describe('DeleteCompleted', () => {
    const deletingState = stateWith('selection', deleting)

    test('success clears the selection', () => {
      assertProperty([deletingState], (before) => {
        const { after, commands } = step(Msg.DeleteCompleted({ succeeded: true }), before)
        return Equal.equals(after.selection, { _tag: 'Selecting', maybeIds: Opt.none() })
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('failure gives the selection back and says so with a toast', () => {
      assertProperty([deletingState], (before) => {
        const { after, commands } = step(Msg.DeleteCompleted({ succeeded: false }), before)
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && onlyChanged(before, after, 'selection')
          && Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not delete the products' })])
      })
    })

    // Only a completion leaves Deleting, so one that arrives elsewhere is a bug.
    test('is a defect when no deletion is in progress', () => {
      assertProperty([state, fc.boolean()], (before, succeeded) => {
        fc.pre(before.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.DeleteCompleted({ succeeded }))(before)).toThrow()
        return true
      })
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every variant of the state', () => {
  const tags = new Set(fc.sample(state, 500).flatMap((s) => [s.list._tag, s.selection._tag]))
  expect([...tags].sort()).toEqual(['Deleting', 'Failed', 'Loaded', 'Loading', 'Selecting'])
})
