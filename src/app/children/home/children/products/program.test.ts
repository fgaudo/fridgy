import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as Domain from '#domain/product.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc, zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import {
  deleting,
  gesture,
  hasExpiringProduct,
  id,
  idle,
  loadedOf,
  message,
  products,
  selecting,
  shown,
  state,
  stateWith,
  still,
  storedProducts,
  ticking,
} from './program.test_arbitrary.ts'
import {
  type Command,
  type Event,
  type Message,
  type Notice,
  type ProductModel,
  productsOf,
  program,
  type Selection,
  type Snackbar,
  type State,
} from './program.ts'
import { ProductListReadError, type StoredProduct } from './services/product-list/product-list.ts'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()

const { outcome, rejects, step } = outcomesOf(program.update)

const selectedIds = (selection: Selection) => selection._tag === 'Idle' ? HashSet.empty<string>() : selection.ids

/** The ids of the loaded products: what can be selected. */
const listedIds = (state: State) =>
  HashSet.fromIterable(
    state.list._tag === 'Loaded' ? state.list.items.flatMap((item) => item._tag === 'Corrupt' ? [] : [item.id]) : [],
  )

/** The ids of the rows arriving: none unless the list is loaded. */
const arrivalsOf = (state: State) => state.list._tag === 'Loaded' ? state.list.arrivals : HashSet.empty<string>()

/** The ids of the rows leaving: none unless the list is loaded. */
const departuresOf = (state: State) =>
  HashSet.fromIterable(state.list._tag === 'Loaded' ? state.list.departures.map(({ item }) => item.id) : [])

/** Whether the list shows a selection: what the back button closes. */
const showsSelection = (state: State) => state.list._tag === 'Loaded' && state.selection._tag !== 'Idle'

/** Whether a row arrives or leaves. */
const isSettling = (state: State) => HashSet.size(arrivalsOf(state)) > 0 || HashSet.size(departuresOf(state)) > 0

/** What the storage sends for products with those ids: not valid ones, which need no time to be shown. */
const storedWith = (ids: ReadonlyArray<string>): ReadonlyArray<StoredProduct> =>
  ids.map((id) => ({
    maybeId: Opt.some(id),
    maybeName: Opt.some(id),
    maybeCreationDate: Opt.none(),
    maybeExpirationDate: Opt.none(),
  }))

/** The snackbar of a notice from `at`, after the one standing, if any. */
const told = (before: State, at: DateTime.Utc, notice: Notice): Snackbar => ({
  _tag: 'Shown',
  at,
  notice,
  entrance: before.snackbar._tag === 'Shown' ? 'AfterAnother' : 'Alone',
})

/**
 * A message that cannot arrive in that state: a completion while no deletion is in progress, the end of the
 * snackbar while there is none, the end of the rows' motion while none moves, a tick while no product expires, a
 * press of the back button while no selection is shown.
 */
const cannotArrive = (msg: Message, before: State) =>
  ((msg._tag === 'Deleted' || msg._tag === 'DeleteFailed') && before.selection._tag !== 'Deleting')
  || (msg._tag === 'BackPressed' && !showsSelection(before))
  || (msg._tag === 'SnackbarExpired' && before.snackbar._tag !== 'Shown')
  || (msg._tag === 'RowsSettled' && !isSettling(before))
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
      assertProperty([ticking, zoned], (before, now) => {
        const { after, commands } = step(Msg.TimeChanged({ now }), before)
        return Equal.equals(after.maybeNow, Opt.some(now)) && onlyChanged(before, after, 'maybeNow')
          && commands.length === 0
      })
    })

    // The clock runs only while a product expires, so a tick heard otherwise is a bug.
    test('is a defect while no product expires', () => {
      assertProperty([still, zoned], (before, now) => {
        expect(() => program.update(Msg.TimeChanged({ now }))(before)).toThrow(Tea.InvariantDefect)
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

    // A list shown for the first time appears whole, rather than opening every row.
    test('the rows arriving are those new to a loaded list and those still arriving that are kept, and none in a list loaded anew', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        const expected = before.list._tag === 'Loaded'
          ? HashSet.union(
            HashSet.difference(listedIds(after), listedIds(before)),
            HashSet.intersection(arrivalsOf(before), listedIds(after)),
          )
          : HashSet.empty<string>()
        return Equal.equals(arrivalsOf(after), expected)
      })
    })

    test('the rows leaving are the rows shown that the change took out, and none in a list loaded anew', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        const expected = before.list._tag === 'Loaded'
          ? HashSet.difference(HashSet.union(listedIds(before), departuresOf(before)), listedIds(after))
          : HashSet.empty<string>()
        return Equal.equals(departuresOf(after), expected)
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
    const changeable = fc.tuple(state, products(), fc.oneof(idle, selecting)).map(
      ([base, items, selection]): State => ({
        ...base,
        list: { _tag: 'Loaded', items, arrivals: HashSet.empty(), departures: [] },
        selection,
      }),
    )

    test('select an unselected listed id, deselect a selected one, touch nothing else, and vibrate on a long press only', () => {
      assertProperty([changeable, id, gesture], (before, itemId, by) => {
        const wasSelected = HashSet.has(selectedIds(before.selection), itemId)
        fc.pre(wasSelected || HashSet.has(listedIds(before), itemId))
        const msg = wasSelected ? Msg.ItemDeselected({ id: itemId, by }) : Msg.ItemSelected({ id: itemId, by })
        const { after, commands } = step(msg, before)
        return HashSet.has(selectedIds(after.selection), itemId) === !wasSelected
          && onlyChanged(before, after, 'selection')
          && Equal.equals(commands, by === 'LongPress' ? [Cmd.Vibrate({ feedback: 'LongPress' })] : [])
      })
    })

    test('selecting then deselecting restores the state', () => {
      assertProperty([changeable, id, gesture, gesture], (before, itemId, selectedBy, deselectedBy) => {
        fc.pre(!HashSet.has(selectedIds(before.selection), itemId) && HashSet.has(listedIds(before), itemId))
        const selected = step(Msg.ItemSelected({ id: itemId, by: selectedBy }), before).after
        return Equal.equals(step(Msg.ItemDeselected({ id: itemId, by: deselectedBy }), selected).after, before)
      })
    })

    test('deselecting the last selected id leaves no selection', () => {
      assertProperty([changeable, id, gesture], (before, itemId, by) => {
        fc.pre(Equal.equals(selectedIds(before.selection), HashSet.make(itemId)))
        return step(Msg.ItemDeselected({ id: itemId, by }), before).after.selection._tag === 'Idle'
      })
    })

    test('are rejected when the id is already in the state they ask for', () => {
      assertProperty(
        [changeable, id, gesture],
        (before, itemId, by) =>
          HashSet.has(selectedIds(before.selection), itemId)
            ? rejects(Msg.ItemSelected({ id: itemId, by }), before)
            : rejects(Msg.ItemDeselected({ id: itemId, by }), before),
      )
    })

    // A tap on a row that the storage has meanwhile removed: the selection would otherwise hold a product that
    // is not in the list.
    test('selecting an id that is not in the list is rejected', () => {
      assertProperty([state, id, gesture], (before, itemId, by) => {
        fc.pre(!HashSet.has(listedIds(before), itemId))
        return rejects(Msg.ItemSelected({ id: itemId, by }), before)
      })
    })

    test('are rejected unless the list is loaded and nothing is being deleted', () => {
      assertProperty([state, id, gesture], (before, itemId, by) => {
        fc.pre(before.list._tag !== 'Loaded' || before.selection._tag === 'Deleting')
        return rejects(Msg.ItemSelected({ id: itemId, by }), before)
          && rejects(Msg.ItemDeselected({ id: itemId, by }), before)
      })
    })
  })

  describe('EditRequested', () => {
    /** The product listed under `id`, when it is a valid one. */
    const productUnder = (state: State, id: string) =>
      state.list._tag === 'Loaded'
        ? Opt.fromNullishOr(state.list.items.find((item) => item._tag === 'Valid' && item.id === id))
        : Opt.none()

    test('asks to edit the listed product, as the row shows it, while nothing is selected, and changes nothing', () => {
      assertProperty([state, id], (before, itemId) => {
        const maybeItem = productUnder(before, itemId)
        fc.pre(before.selection._tag === 'Idle' && Opt.isSome(maybeItem))
        const item = Opt.getOrThrow(maybeItem)
        return item._tag === 'Valid'
          && Equal.equals(step(Msg.EditRequested({ id: itemId }), before), {
            rejected: false,
            after: before,
            commands: [],
            events: [Ev.EditRequested({ id: itemId, product: item.product })],
          })
      })
    })

    test('is rejected while products are selected or deleted, and on an id that names no valid product', () => {
      assertProperty([state, id], (before, itemId) => {
        fc.pre(before.selection._tag !== 'Idle' || Opt.isNone(productUnder(before, itemId)))
        return rejects(Msg.EditRequested({ id: itemId }), before)
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

  // As Material's contextual action bar; a deletion in progress holds the press, so that the app stays.
  test('BackPressed empties the selection, and changes nothing while it is being deleted', () => {
    assertProperty([state], (before) => {
      fc.pre(showsSelection(before))
      const { after, commands } = step(Msg.BackPressed(), before)
      return (before.selection._tag === 'Deleting'
        ? Equal.equals(after, before)
        : after.selection._tag === 'Idle' && onlyChanged(before, after, 'selection'))
        && commands.length === 0
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
        [products(), fc.array(id, { minLength: 1, maxLength: 6 })],
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

    // The snackbar comes after the one standing, which leaves first.
    test('clears the selection and offers to undo the deletion, of its products, for a while, its snackbar after the one standing, with a vibration', () => {
      assertProperty([deletingState, utc], (before, at) => {
        const { after, commands } = step(Msg.Deleted({ at }), before)
        return before.selection._tag === 'Deleting'
          && after.selection._tag === 'Idle'
          && Equal.equals(
            after.snackbar,
            told(before, at, {
              _tag: 'Deleted',
              count: PositiveInteger.makeUnsafe(HashSet.size(before.selection.ids)),
              maybeProducts: before.selection.maybeProducts,
            }),
          )
          && onlyChanged(before, after, 'selection', 'snackbar')
          && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Confirm' })])
      })
    })

    // Only a completion leaves Deleting, so one that arrives elsewhere is a bug.
    test('is a defect when no deletion is in progress', () => {
      assertProperty([state, utc], (before, at) => {
        fc.pre(before.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.Deleted({ at }))(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  describe('DeleteFailed', () => {
    // Its snackbar replaces the one standing, an offer to undo included.
    test('gives the selection back and says so with a snackbar, after the one standing, and a vibration', () => {
      assertProperty([stateWith('selection', deleting), utc], (before, at) => {
        const { after, commands } = step(Msg.DeleteFailed({ at }), before)
        return after.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.selection), selectedIds(before.selection))
          && Equal.equals(after.snackbar, told(before, at, { _tag: 'DeleteFailed' }))
          && onlyChanged(before, after, 'selection', 'snackbar')
          && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Reject' })])
      })
    })

    test('is a defect when no deletion is in progress', () => {
      assertProperty([state, utc], (before, at) => {
        fc.pre(before.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.DeleteFailed({ at }))(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  describe('UndoRequested', () => {
    test('stores the deleted products again and withdraws the snackbar, while it offers to', () => {
      assertProperty([stateWith('snackbar', shown)], (before) => {
        if (
          before.snackbar._tag !== 'Shown' || before.snackbar.notice._tag !== 'Deleted'
          || Opt.isNone(before.snackbar.notice.maybeProducts)
        ) {
          return rejects(Msg.UndoRequested(), before)
        }
        const { after, commands } = step(Msg.UndoRequested(), before)
        return after.snackbar._tag === 'None'
          && onlyChanged(before, after, 'snackbar')
          && Equal.equals(commands, [Cmd.Restore({ products: before.snackbar.notice.maybeProducts.value })])
      })
    })

    test('is rejected when no snackbar is shown', () => {
      assertProperty(
        [stateWith('snackbar', fc.constant({ _tag: 'None' } as const))],
        (before) => rejects(Msg.UndoRequested(), before),
      )
    })
  })

  describe('SnackbarExpired', () => {
    test('withdraws the snackbar, and an offer to undo with it, and touches nothing else', () => {
      assertProperty([stateWith('snackbar', shown)], (before) => {
        const { after, commands } = step(Msg.SnackbarExpired(), before)
        return after.snackbar._tag === 'None' && onlyChanged(before, after, 'snackbar') && commands.length === 0
      })
    })

    // The timer runs only while a snackbar is shown, so its end heard otherwise is a bug.
    test('is a defect when no snackbar is shown', () => {
      assertProperty([stateWith('snackbar', fc.constant({ _tag: 'None' } as const))], (before) => {
        expect(() => program.update(Msg.SnackbarExpired())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  describe('RowsSettled', () => {
    test('makes the arriving rows rows like the others, drops the leaving ones, forgets the time unless a product still expires, and touches nothing else', () => {
      assertProperty([state.filter(isSettling)], (before) => {
        const { after, commands } = step(Msg.RowsSettled(), before)
        return before.list._tag === 'Loaded'
          && Equal.equals(after.list, { ...before.list, arrivals: HashSet.empty(), departures: [] })
          && Equal.equals(after.maybeNow, hasExpiringProduct(after) ? before.maybeNow : Opt.none())
          && onlyChanged(before, after, 'list', 'maybeNow')
          && commands.length === 0
      })
    })

    // The timer runs only while a row arrives or leaves, so its end heard otherwise is a bug.
    test('is a defect while no row arrives or leaves', () => {
      assertProperty([state.filter((s) => !isSettling(s))], (before) => {
        expect(() => program.update(Msg.RowsSettled())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  // The storage is as it was: there is nothing to give back but the news.
  test('RestoreFailed says so with a snackbar, after the one standing, and a vibration, and changes nothing else', () => {
    assertProperty([state, utc], (before, at) => {
      const { after, commands } = step(Msg.RestoreFailed({ at }), before)
      return Equal.equals(after.snackbar, told(before, at, { _tag: 'RestoreFailed' }))
        && onlyChanged(before, after, 'snackbar')
        && Equal.equals(commands, [Cmd.Vibrate({ feedback: 'Reject' })])
    })
  })
})

// The storage is observed in every state; the clock ticks only for a product that expires; the snackbar is timed
// from what it tells; the rows' motion, by the rows arriving and leaving.
test('listens to the storage always, to the clock while a product shown expires, and times the snackbar and the rows moving', () => {
  assertProperty([state], (s) => {
    const subscriptions = Tea.subscriptionsOf(program)(s)
    const timesSnackbar = s.snackbar._tag === 'Shown'
      && HashMap.has(subscriptions, ['snackbar', s.snackbar.at, s.snackbar.notice._tag])
    const timesMotion = HashMap.has(subscriptions, ['settling', arrivalsOf(s), departuresOf(s)])
    return HashMap.has(subscriptions, 'changes') && HashMap.has(subscriptions, 'clock') === hasExpiringProduct(s)
      && (s.snackbar._tag === 'Shown') === timesSnackbar
      && isSettling(s) === timesMotion
  })
})

// Otherwise the press is Home's, or the platform's, which leaves the app.
test('observes the back button only while the list shows a selection', () => {
  assertProperty([state], (s) => HashMap.has(Tea.subscriptionsOf(program)(s), 'back-button') === showsSelection(s))
})

// A row's look and action, a product's status and the snackbar are decided here, not in the view.
describe('Products model', () => {
  /** The rows of a loaded list at a known time. */
  const rows = (state: State) => {
    const { list } = program.makeModel(state)
    return list._tag === 'Available' ? list.products : []
  }

  const isLeaving = (row: ProductModel) => row._tag !== 'Corrupt' && row.presence === 'Leaving'

  /** The rows of the products listed, without the ones leaving. */
  const listedRows = (state: State) => rows(state).filter((row) => !isLeaving(row))

  /** A loaded list of products, with a time when one of them expires. */
  const loaded = fc.tuple(state, products({ minLength: 1 }).chain(loadedOf), maybe(zoned)).map(
    ([base, list, maybeNow]): State => {
      const loaded: State = { ...base, list, maybeNow }
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

  test('every stored product is a row, in order, with its kind, and every row leaving is one taken out, in order', () => {
    assertProperty([shown], (s) => {
      const items = s.list._tag === 'Loaded' ? s.list.items : []
      const departures = s.list._tag === 'Loaded' ? s.list.departures : []
      const listed = listedRows(s)
      const leaving = rows(s).filter(isLeaving)
      return listed.length === items.length && listed.every((row, index) => row._tag === items[index]?._tag)
        && Equal.equals(
          leaving.map((row) => row._tag === 'Corrupt' ? '' : row.id),
          departures.map(({ item }) => item.id),
        )
    })
  })

  // Deleting rows apart: the rows between them stay where they are while the others close their place.
  test('rows taken out stay where they were while they leave, and rows put back arrive there', () => {
    const changed = (ids: ReadonlyArray<string>) => Msg.ListChanged({ result: Result.succeed(storedWith(ids)) })
    const presences = (s: State) => rows(s).map((row) => row._tag === 'Corrupt' ? '' : `${row.id}:${row.presence}`)
    const loaded = step(changed(['1', '2', '3', '4', '5']), program.init.state).after
    const deleted = step(changed(['1', '3', '5']), loaded).after
    const restored = step(changed(['1', '2', '3', '5']), deleted).after
    expect(presences(loaded)).toEqual(['1:Listed', '2:Listed', '3:Listed', '4:Listed', '5:Listed'])
    expect(presences(deleted)).toEqual(['1:Listed', '2:Leaving', '3:Listed', '4:Leaving', '5:Listed'])
    expect(presences(restored)).toEqual(['1:Listed', '2:Arriving', '3:Listed', '4:Leaving', '5:Listed'])
    expect(presences(step(Msg.RowsSettled(), restored).after)).toEqual(['1:Listed', '2:Listed', '3:Listed', '5:Listed'])
  })

  test('a row is selected exactly when its id is, and a long press toggles its selection unless a deletion is in progress or it leaves', () => {
    assertProperty([shown], (s) => {
      const selected = selectedIds(s.selection)
      return rows(s).every((row) => {
        if (row._tag === 'Corrupt') return true
        if (row.presence === 'Leaving') return !row.selection.isSelected && Opt.isNone(row.selection.maybeToggle)
        const isSelected = HashSet.has(selected, row.id)
        const expectedToggle = s.selection._tag === 'Deleting'
          ? Opt.none()
          : Opt.some(
            isSelected
              ? Msg.ItemDeselected({ id: row.id, by: 'LongPress' })
              : Msg.ItemSelected({ id: row.id, by: 'LongPress' }),
          )
        return row.selection.isSelected === isSelected && Equal.equals(row.selection.maybeToggle, expectedToggle)
      })
    })
  })

  // As Material's lists do: a tap opens an item, and selects once something is selected.
  test('a tap on a row opens its product while nothing is selected, toggles it while selecting, and does nothing otherwise', () => {
    assertProperty([shown], (s) =>
      rows(s).every((row) => {
        if (row._tag === 'Corrupt') return true
        const expected = s.selection._tag === 'Selecting'
          ? Opt.map(
            row.selection.maybeToggle,
            () =>
              row.selection.isSelected
                ? Msg.ItemDeselected({ id: row.id, by: 'Tap' })
                : Msg.ItemSelected({ id: row.id, by: 'Tap' }),
          )
          : s.selection._tag === 'Idle' && row._tag === 'Valid' && row.presence !== 'Leaving'
          ? Opt.some(Msg.EditRequested({ id: row.id }))
          : Opt.none()
        return Equal.equals(row.selection.maybeTap, expected)
      }))
  })

  test('a listed row arrives exactly when its id does', () => {
    assertProperty(
      [shown],
      (s) =>
        listedRows(s).every((row) =>
          row._tag === 'Corrupt' || (row.presence === 'Arriving') === HashSet.has(arrivalsOf(s), row.id)
        ),
    )
  })

  test('a valid product expired yesterday the day after its expiration day, is stale later, expiring today on that day, tomorrow on the day before, fresh earlier, and keeps the domain\'s freshness', () => {
    assertProperty([shown], (s) => {
      const items = s.list._tag === 'Loaded' ? s.list.items : []
      return listedRows(s).every((row, index) => {
        const item = items[index]
        if (row._tag !== 'Valid' || item?._tag !== 'Valid') return row._tag === item?._tag
        return Opt.match(Domain.maybeExpiration(item.product), {
          onNone: () => row.status._tag === 'Everlasting',
          onSome: (expiration) => {
            // A product that expires is shown only at a known time.
            const status = Domain.expirationStatus(Opt.getOrThrow(s.maybeNow))(expiration)
            if (status.hasExpired) {
              return status.daysSinceExpiration === 1
                ? row.status._tag === 'ExpiredYesterday'
                : row.status._tag === 'Stale' && row.status.daysAgo === status.daysSinceExpiration
            }
            const { daysUntilExpiration } = status
            return daysUntilExpiration === 0
              ? row.status._tag === 'ExpiringToday' && row.status.freshness === status.freshness
              : daysUntilExpiration === 1
              ? row.status._tag === 'ExpiringTomorrow' && row.status.freshness === status.freshness
              : row.status._tag === 'Fresh' && row.status.inDays === daysUntilExpiration
                && row.status.freshness === status.freshness
          },
        })
      })
    })
  })

  // Whatever the list shows: the last products may have just been deleted.
  test('the snackbar tells what the state says, coming as it says, with the way to undo a deletion when its products can come back', () => {
    assertProperty([state], (s) => {
      const { snackbar } = program.makeModel(s)
      if (s.snackbar._tag === 'None') return snackbar._tag === 'None'
      if (snackbar._tag !== 'Shown') return false
      const { notice } = s.snackbar
      return Equal.equals(snackbar.at, s.snackbar.at)
        && snackbar.entrance === s.snackbar.entrance
        && (notice._tag === 'Deleted'
          ? snackbar.notice._tag === 'Deleted'
            && snackbar.notice.count === notice.count
            && Equal.equals(snackbar.notice.maybeUndo, Opt.map(notice.maybeProducts, () => Msg.UndoRequested()))
          : snackbar.notice._tag === notice._tag)
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
      `snackbar:${s.snackbar._tag === 'Shown' ? s.snackbar.notice._tag : 'None'}`,
      ...(s.snackbar._tag === 'Shown' && s.snackbar.notice._tag === 'Deleted'
        ? [`restorable:${s.snackbar.notice.maybeProducts._tag}`]
        : []),
      ...(s.list._tag === 'Loaded'
        ? [
          `arrivals:${HashSet.size(s.list.arrivals) > 0 ? 'Some' : 'None'}`,
          `departures:${s.list.departures.length > 0 ? 'Some' : 'None'}`,
        ]
        : []),
    ]),
  )
  expect([...tags].sort()).toEqual([
    'arrivals:None',
    'arrivals:Some',
    'departures:None',
    'departures:Some',
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
    'snackbar:DeleteFailed',
    'snackbar:Deleted',
    'snackbar:None',
    'snackbar:RestoreFailed',
  ])
})
