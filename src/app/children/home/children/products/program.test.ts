import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Duration from 'effect/Duration'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as Domain from '#domain/product.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import {
  deleting,
  hasExpiringProduct,
  id,
  idle,
  message,
  product,
  recent,
  selecting,
  state,
  stateWith,
  still,
  storedProducts,
  ticking,
} from './program.test_arbitrary.ts'
import { type Command, type Message, productsOf, program, type Selection, type State } from './program.ts'
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

/**
 * A message that cannot arrive in that state: a completion while no deletion is in progress, the end of the offer
 * to undo while there is none, a tick while no product expires.
 */
const cannotArrive = (msg: Message, before: State) =>
  ((msg._tag === 'Deleted' || msg._tag === 'DeleteFailed') && before.selection._tag !== 'Deleting')
  || (msg._tag === 'UndoExpired' && before.lastDeletion._tag !== 'Recent')
  || (msg._tag === 'TimeChanged' && !hasExpiringProduct(before))

describe('Products update', () => {
  test('is total and deterministic, but for a message that cannot arrive', () => {
    assertProperty([state, message], (before, msg) => {
      fc.pre(!cannotArrive(msg, before))
      return Equal.equals(outcome(msg, before), outcome(msg, before))
    })
  })

  describe('TimeChanged', () => {
    test('stores the time and touches nothing else, while a product expires', () => {
      assertProperty([ticking, utc], (before, now) => {
        const { after, commands } = step(Msg.TimeChanged({ now }), before)
        return Equal.equals(after.maybeNow, Opt.some(now)) && onlyChanged(before, after, 'maybeNow')
          && commands.length === 0
      })
    })

    // The clock runs only while a product expires, so a tick heard otherwise is a bug.
    test('is a defect while no product expires', () => {
      assertProperty([still, utc], (before, now) => {
        expect(() => program.update(Msg.TimeChanged({ now }))(before)).toThrow()
        return true
      })
    })
  })

  describe('ListChanged', () => {
    const changed = (products: ReadonlyArray<StoredProduct>) => Msg.ListChanged({ result: Result.succeed(products) })

    test('a failure marks the list as failed, forgets the time and touches nothing else', () => {
      assertProperty([state, fc.string()], (before, cause) => {
        const failed = Msg.ListChanged({ result: Result.fail(new ProductListReadError({ cause })) })
        const { after, commands } = step(failed, before)
        return after.list._tag === 'Failed' && Opt.isNone(after.maybeNow)
          && onlyChanged(before, after, 'list', 'maybeNow')
          && commands.length === 0
      })
    })

    // The clock stops with the last product that expires, and starts anew with the next one.
    test('the time is kept while a product still expires, and forgotten otherwise', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        return Equal.equals(after.maybeNow, hasExpiringProduct(after) ? before.maybeNow : Opt.none())
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
          && onlyChanged(before, after, 'list', 'selection', 'maybeNow')
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

  describe('DeleteStarted', () => {
    test('deletes the selection, keeping its products, or is rejected when there is none or the list is not loaded', () => {
      assertProperty([state], (before) => {
        if (before.list._tag !== 'Loaded' || before.selection._tag !== 'Selecting') {
          return rejects(Msg.DeleteStarted(), before)
        }
        const { after, commands } = step(Msg.DeleteStarted(), before)
        return Equal.equals(after.selection, {
          _tag: 'Deleting',
          ids: before.selection.ids,
          maybeProducts: productsOf(before.list.items, before.selection.ids),
        })
          && onlyChanged(before, after, 'selection')
          && Equal.equals(commands, [Cmd.Delete({ ids: before.selection.ids })])
      })
    })

    // Only products can be stored again: a deletion that takes stored data that is not one along cannot be undone.
    test('the products of the deletion are those the ids name, in order, when every id names one', () => {
      assertProperty(
        [fc.array(product, { maxLength: 8 }), fc.array(id, { minLength: 1, maxLength: 6 })],
        (items, ids) => {
          const set = HashSet.fromIterable(ids)
          const named = items.flatMap((item) =>
            item._tag === 'Valid' && HashSet.has(set, item.id) ? [item.product] : []
          )
          const everyIdNamesOne = ids.every((id) => items.some((item) => item._tag === 'Valid' && item.id === id))
          return Equal.equals(productsOf(items, set), everyIdNamesOne ? Opt.some(named) : Opt.none())
        },
      )
    })
  })

  describe('Deleted', () => {
    const deletingState = stateWith('selection', deleting)

    test('clears the selection and offers to undo the deletion, of its products, for a while', () => {
      assertProperty([deletingState, utc], (before, at) => {
        const { after, commands } = step(Msg.Deleted({ at }), before)
        return before.selection._tag === 'Deleting'
          && after.selection._tag === 'Idle'
          && Equal.equals(after.lastDeletion, {
            _tag: 'Recent',
            at,
            count: HashSet.size(before.selection.ids),
            maybeProducts: before.selection.maybeProducts,
          })
          && onlyChanged(before, after, 'selection', 'lastDeletion')
          && commands.length === 0
      })
    })

    // Only a completion leaves Deleting, so one that arrives elsewhere is a bug.
    test('is a defect when no deletion is in progress', () => {
      assertProperty([state, utc], (before, at) => {
        fc.pre(before.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.Deleted({ at }))(before)).toThrow()
        return true
      })
    })
  })

  describe('DeleteFailed', () => {
    test('gives the selection back and says so with a toast', () => {
      assertProperty([stateWith('selection', deleting)], (before) => {
        const { after, commands } = step(Msg.DeleteFailed(), before)
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && onlyChanged(before, after, 'selection')
          && Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not delete the products' })])
      })
    })

    test('is a defect when no deletion is in progress', () => {
      assertProperty([state], (before) => {
        fc.pre(before.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.DeleteFailed())(before)).toThrow()
        return true
      })
    })
  })

  describe('UndoRequested', () => {
    test('stores the deleted products again and withdraws the offer, while it stands', () => {
      assertProperty([stateWith('lastDeletion', recent)], (before) => {
        if (before.lastDeletion._tag !== 'Recent' || Opt.isNone(before.lastDeletion.maybeProducts)) {
          return rejects(Msg.UndoRequested(), before)
        }
        const { after, commands } = step(Msg.UndoRequested(), before)
        return after.lastDeletion._tag === 'None'
          && onlyChanged(before, after, 'lastDeletion')
          && Equal.equals(commands, [Cmd.Restore({ products: before.lastDeletion.maybeProducts.value })])
      })
    })

    test('is rejected when no deletion is recent', () => {
      assertProperty(
        [stateWith('lastDeletion', fc.constant({ _tag: 'None' } as const))],
        (before) => rejects(Msg.UndoRequested(), before),
      )
    })
  })

  describe('UndoExpired', () => {
    test('withdraws the offer and touches nothing else', () => {
      assertProperty([stateWith('lastDeletion', recent)], (before) => {
        const { after, commands } = step(Msg.UndoExpired(), before)
        return after.lastDeletion._tag === 'None' && onlyChanged(before, after, 'lastDeletion')
          && commands.length === 0
      })
    })

    // The timer runs only while a deletion is recent, so its end heard otherwise is a bug.
    test('is a defect when no deletion is recent', () => {
      assertProperty([stateWith('lastDeletion', fc.constant({ _tag: 'None' } as const))], (before) => {
        expect(() => program.update(Msg.UndoExpired())(before)).toThrow()
        return true
      })
    })
  })

  // The storage is as it was: there is nothing to give back but the news.
  test('RestoreFailed says so with a toast, and changes nothing', () => {
    assertProperty([state], (before) => {
      const { after, commands } = step(Msg.RestoreFailed(), before)
      return Equal.equals(after, before)
        && Equal.equals(commands, [Cmd.ShowToast({ text: 'Could not put the products back' })])
    })
  })
})

// The storage is observed in every state; the clock ticks only for a product that expires; the offer to undo the
// last deletion is timed from it.
test('listens to the storage always, to the clock while a loaded product expires, and times a recent deletion', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    const timesUndo = s.lastDeletion._tag === 'Recent' && HashMap.has(subscriptions, ['undo', s.lastDeletion.at])
    return HashMap.has(subscriptions, 'changes') && HashMap.has(subscriptions, 'clock') === hasExpiringProduct(s)
      && (s.lastDeletion._tag === 'Recent') === timesUndo
  })
})

// A row's look and action, a product's status and the snackbar are decided here, not in the view.
describe('Products model', () => {
  const DAY = 86_400_000

  /** The rows of a loaded list at a known time. */
  const rows = (state: State) => {
    const { list } = program.makeModel(state)
    return list._tag === 'Available' ? list.products : []
  }

  /** A loaded list of products, with a time when one of them expires. */
  const loaded = fc.tuple(state, fc.array(product, { minLength: 1, maxLength: 8 }), maybe(utc)).map(
    ([base, items, maybeNow]): State => {
      const loaded: State = { ...base, list: { _tag: 'Loaded', items }, maybeNow }
      return hasExpiringProduct(loaded) ? loaded : { ...loaded, maybeNow: Opt.none() }
    },
  )

  const shown = loaded.filter((s) => !hasExpiringProduct(s) || Opt.isSome(s.maybeNow))

  // Nothing is drawn, rather than products without their status, or with one from a time that is not known.
  test('a loaded list is shown at once when no product expires, and once the clock has ticked otherwise', () => {
    assertProperty(
      [loaded],
      (s) => (program.makeModel(s).list._tag === 'Available') === (!hasExpiringProduct(s) || Opt.isSome(s.maybeNow)),
    )
  })

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

  test('a valid product is stale once its expiration day is over, expiring on its last day, fresh before, and keeps the domain\'s freshness', () => {
    assertProperty([shown], (s) => {
      const items = s.list._tag === 'Loaded' ? s.list.items : []
      return rows(s).every((row, index) => {
        const item = items[index]
        if (row._tag !== 'Valid' || item?._tag !== 'Valid') return row._tag === item?._tag
        return Opt.match(Domain.maybeExpiration(item.product), {
          onNone: () => row.status._tag === 'Everlasting',
          onSome: (expiration) => {
            // A product that expires is shown only at a known time.
            const status = Domain.expirationStatus(Opt.getOrThrow(s.maybeNow))(expiration)
            if (status.hasExpired) return row.status._tag === 'Stale'
            const daysLeft = Math.ceil(Duration.toMillis(status.timeLeft) / DAY)
            return daysLeft === 1
              ? row.status._tag === 'ExpiringToday' && row.status.freshness === status.freshness
              : row.status._tag === 'Fresh' && row.status.daysLeft === daysLeft
                && row.status.freshness === status.freshness
          },
        })
      })
    })
  })

  // Whatever the list shows: the last products may have just been deleted.
  test('the snackbar says how many products were deleted while the deletion is recent, with the way to undo it when its products can come back', () => {
    assertProperty([state], (s) => {
      const { lastDeletion } = program.makeModel(s)
      if (s.lastDeletion._tag === 'None') return lastDeletion._tag === 'None'
      return lastDeletion._tag === 'Deleted'
        && lastDeletion.count === s.lastDeletion.count
        && Equal.equals(lastDeletion.maybeUndo, Opt.map(s.lastDeletion.maybeProducts, () => Msg.UndoRequested()))
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every variant of the state', () => {
  const tags = new Set(
    fc.sample(state, 500).flatMap((s) => [
      `list:${s.list._tag}`,
      `selection:${s.selection._tag}`,
      `now:${s.maybeNow._tag}`,
      `lastDeletion:${s.lastDeletion._tag}`,
      ...(s.lastDeletion._tag === 'Recent' ? [`restorable:${s.lastDeletion.maybeProducts._tag}`] : []),
    ]),
  )
  expect([...tags].sort()).toEqual([
    'lastDeletion:None',
    'lastDeletion:Recent',
    'list:Failed',
    'list:Loaded',
    'list:Loading',
    'now:None',
    'now:Some',
    'restorable:None',
    'restorable:Some',
    'selection:Deleting',
    'selection:Idle',
    'selection:Selecting',
  ])
})
