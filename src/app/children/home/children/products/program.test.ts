import { describe, expect, test } from 'bun:test'
import * as Data from 'effect/Data'
import * as Duration from 'effect/Duration'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as Domain from '#domain/product.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import {
  deleting,
  id,
  idle,
  message,
  product,
  selecting,
  state,
  stateWith,
  storedProducts,
} from './program.test_arbitrary.ts'
import { type Command, type Message, program, type Selection, type State } from './program.ts'
import { ProductListReadError, type StoredProduct } from './services/product-list/product-list.ts'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()

const { outcome, rejects, step } = outcomesOf(program.update)

const selectedIds = (selection: Selection) => selection._tag === 'Idle' ? HashSet.empty<string>() : selection.ids

/** The ids of the loaded products: what can be selected. */
const listedIds = (state: State) =>
  HashSet.fromIterable(
    state.list._tag === 'Loaded' ? state.list.items.flatMap((item) => item._tag === 'Corrupt' ? [] : [item.id]) : [],
  )

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
      assertProperty([state, fc.string()], (before, cause) => {
        const failed = Msg.ListChanged({ result: Result.fail(new ProductListReadError({ cause })) })
        const { after, commands } = step(failed, before)
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
        const kept = HashSet.intersection(selectedIds(before.selection), existingIds)
        return after.selection._tag === (HashSet.size(kept) === 0 ? 'Idle' : 'Selecting')
          && Equal.equals(selectedIds(after.selection), kept)
      })
    })
  })

  describe('ItemSelected and ItemDeselected', () => {
    // A loaded list and no deletion in progress, with a selection that may or may not be among its products.
    const changeable = fc.tuple(state, fc.array(product, { maxLength: 8 }), fc.oneof(idle, selecting)).map(
      ([base, items, selection]): State => ({ ...base, list: { _tag: 'Loaded', items }, selection }),
    )

    test('select an unselected listed id, deselect a selected one, and touch nothing else', () => {
      assertProperty([changeable, id], (before, itemId) => {
        const wasSelected = HashSet.has(selectedIds(before.selection), itemId)
        fc.pre(wasSelected || HashSet.has(listedIds(before), itemId))
        const msg = wasSelected ? Msg.ItemDeselected({ id: itemId }) : Msg.ItemSelected({ id: itemId })
        const { after, commands } = step(msg, before)
        return HashSet.has(selectedIds(after.selection), itemId) === !wasSelected
          && onlyChanged(before, after, 'selection')
          && commands.length === 0
      })
    })

    test('selecting then deselecting restores the state', () => {
      assertProperty([changeable, id], (before, itemId) => {
        fc.pre(!HashSet.has(selectedIds(before.selection), itemId) && HashSet.has(listedIds(before), itemId))
        const selected = step(Msg.ItemSelected({ id: itemId }), before).after
        return Equal.equals(step(Msg.ItemDeselected({ id: itemId }), selected).after, before)
      })
    })

    test('deselecting the last selected id leaves no selection', () => {
      assertProperty([changeable, id], (before, itemId) => {
        fc.pre(Equal.equals(selectedIds(before.selection), HashSet.make(itemId)))
        return step(Msg.ItemDeselected({ id: itemId }), before).after.selection._tag === 'Idle'
      })
    })

    test('are rejected when the id is already in the state they ask for', () => {
      assertProperty([changeable, id], (before, itemId) =>
        HashSet.has(selectedIds(before.selection), itemId)
          ? rejects(Msg.ItemSelected({ id: itemId }), before)
          : rejects(Msg.ItemDeselected({ id: itemId }), before))
    })

    // A tap on a row that the storage has meanwhile removed: the selection would otherwise hold a product that
    // is not in the list.
    test('selecting an id that is not in the list is rejected', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(!HashSet.has(listedIds(before), itemId))
        return rejects(Msg.ItemSelected({ id: itemId }), before)
      })
    })

    test('are rejected unless the list is loaded and nothing is being deleted', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(before.list._tag !== 'Loaded' || before.selection._tag === 'Deleting')
        return rejects(Msg.ItemSelected({ id: itemId }), before) && rejects(Msg.ItemDeselected({ id: itemId }), before)
      })
    })
  })

  test('SelectionCleared empties the selection, or is rejected when there is none or the list is not loaded', () => {
    assertProperty([state], (before) => {
      if (before.list._tag !== 'Loaded' || before.selection._tag !== 'Selecting') {
        return rejects(Msg.SelectionCleared(), before)
      }
      const { after, commands } = step(Msg.SelectionCleared(), before)
      return after.selection._tag === 'Idle' && onlyChanged(before, after, 'selection') && commands.length === 0
    })
  })

  test('DeleteStarted deletes the selection, or is rejected when there is none or the list is not loaded', () => {
    assertProperty([state], (before) => {
      if (before.list._tag !== 'Loaded' || before.selection._tag !== 'Selecting') {
        return rejects(Msg.DeleteStarted(), before)
      }
      const { after, commands } = step(Msg.DeleteStarted(), before)
      return after.selection._tag === 'Deleting'
        && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
        && onlyChanged(before, after, 'selection')
        && Equal.equals(commands, [Cmd.Delete({ ids: before.selection.ids })])
    })
  })

  describe('DeleteCompleted', () => {
    const deletingState = stateWith('selection', deleting)

    test('success clears the selection', () => {
      assertProperty([deletingState], (before) => {
        const { after, commands } = step(Msg.DeleteCompleted({ succeeded: true }), before)
        return after.selection._tag === 'Idle' && onlyChanged(before, after, 'selection') && commands.length === 0
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

// A row's look and action, and a product's status, are decided here, not in the view.
describe('Products model', () => {
  const DAY = 86_400_000

  /** The rows of a loaded list at a known time. */
  const rows = (state: State) => {
    const model = program.makeModel(state)
    return model._tag === 'Available' ? model.products : []
  }

  const shown = fc.tuple(state, fc.array(product, { minLength: 1, maxLength: 8 }), utc).map(
    ([base, items, now]): State => ({ ...base, list: { _tag: 'Loaded', items }, maybeNow: Opt.some(now) }),
  )

  test('every stored product is a row, in order, with its kind', () => {
    assertProperty([shown], (s) => {
      const items = s.list._tag === 'Loaded' ? s.list.items : []
      const drawn = rows(s)
      return drawn.length === items.length && drawn.every((row, index) => row._tag === items[index]?._tag)
    })
  })

  test('a row is selected exactly when its id is, and toggles its selection unless a deletion is in progress', () => {
    assertProperty([shown], (s) => {
      const selected = selectedIds(s.selection)
      return rows(s).every((row) => {
        if (row._tag === 'Corrupt') return true
        const isSelected = HashSet.has(selected, row.id)
        const expectedToggle = s.selection._tag === 'Deleting'
          ? Opt.none()
          : Opt.some(isSelected ? Msg.ItemDeselected({ id: row.id }) : Msg.ItemSelected({ id: row.id }))
        return row.selection.isSelected === isSelected && Equal.equals(row.selection.maybeToggle, expectedToggle)
      })
    })
  })

  test('a valid product is stale once its expiration day is over, expiring on its last day, fresh before', () => {
    assertProperty([shown], (s) => {
      const now = Opt.getOrThrow(s.maybeNow)
      const items = s.list._tag === 'Loaded' ? s.list.items : []
      return rows(s).every((row, index) => {
        const item = items[index]
        if (row._tag !== 'Valid' || item?._tag !== 'Valid') return row._tag === item?._tag
        return Opt.match(Domain.maybeExpiration(item.product), {
          onNone: () => row.status._tag === 'Everlasting',
          onSome: (expiration) => {
            const status = Domain.expirationStatus(now)(expiration)
            if (status.hasExpired) return row.status._tag === 'Stale'
            const daysLeft = Math.ceil(Duration.toMillis(status.timeLeft) / DAY)
            return daysLeft === 1
              ? row.status._tag === 'ExpiringToday'
              : row.status._tag === 'Fresh' && row.status.daysLeft === daysLeft
          },
        })
      })
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every variant of the state', () => {
  const tags = new Set(fc.sample(state, 500).flatMap((s) => [s.list._tag, s.selection._tag]))
  expect([...tags].sort()).toEqual(['Deleting', 'Failed', 'Idle', 'Loaded', 'Loading', 'Selecting'])
})
