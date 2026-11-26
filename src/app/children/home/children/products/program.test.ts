import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as fc from 'fast-check'
import * as SnackbarArbitrary from '#app/programs/snackbar/program.test_arbitrary.ts'
import type * as Snackbar from '#app/programs/snackbar/program.ts'
import * as ProductArbitrary from '#domain/product.test_arbitrary.ts'
import * as Domain from '#domain/product.ts'
import { ProductsReadError, type StoredProduct } from '#infrastructure/storage/products.ts'
import * as Day from '#libs/dates/day.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { zone, zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty, onlyChanged, outcomesOf } from '#libs/testing/update.test_support.ts'
import type { ProductModel } from './list.ts'
import {
  deleting,
  gesture,
  hasExpiringProduct,
  id,
  idle,
  loadedOf,
  message,
  notice,
  own,
  products,
  selecting,
  state,
  stateWith,
  still,
  storedProducts,
  ticking,
  type Whole,
  wholeOf,
} from './program.test_arbitrary.ts'
import { type Command, type Event, type Message, program, type State } from './program.ts'
import { type Notice, productsOf, type Selection } from './selection.ts'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()
const Ev = Data.taggedEnum<Event>()

const { outcome, rejects, step } = outcomesOf(program.update)

const selectedIds = (selection: Selection) =>
  selection._tag === 'Idle' ? HashSet.empty<Domain.ProductId>() : selection.ids

/** The ids of the loaded products: what can be selected. */
const listedIds = (state: State) =>
  HashSet.fromIterable(
    state.list._tag === 'Loaded' ? state.list.items.map((item) => item.id) : [],
  )

/** The ids of the rows arriving: none unless the list is loaded. */
const arrivalsOf = (state: State) =>
  state.list._tag === 'Loaded' ? state.list.arrivals : HashSet.empty<Domain.ProductId>()

/** The ids of the rows leaving: none unless the list is loaded. */
const departuresOf = (state: State) =>
  HashSet.fromIterable(state.list._tag === 'Loaded' ? state.list.departures.map(({ item }) => item.id) : [])

/** Whether the list shows a selection: what the back button closes. */
const showsSelection = (state: State) => state.list._tag === 'Loaded' && state.selection._tag !== 'Idle'

/** Whether a row arrives or leaves. */
const isSettling = (state: State) => HashSet.size(arrivalsOf(state)) > 0 || HashSet.size(departuresOf(state)) > 0

/** What the storage sends for products with those ids: not valid ones, which need no time to be shown. */
const storedWith = (ids: ReadonlyArray<Domain.ProductId>): ReadonlyArray<StoredProduct> =>
  ids.map((id) => ({
    id,
    maybeName: Opt.some(`Product ${id}`),
    maybeCreationDate: Opt.none(),
    maybeExpirationDate: Opt.some(Opt.none()),
  }))

/** The snackbar standing in a state, as the library keeps it. */
const standingOf = (state: Whole): Opt.Option<Snackbar.Standing<Notice>> =>
  Opt.flatMap(state.children.Snackbar, ({ state }) => state.maybeStanding)

/** The states with a snackbar standing, and those with none. */
const withStanding = wholeOf(own, SnackbarArbitrary.standing(notice))

const withNone = wholeOf(own, SnackbarArbitrary.none())

type Commands = ReadonlyArray<Tea.CommandOf<typeof program>>

/** Products' own commands among a step's: the snackbar's are its own. */
const ownCommands = (commands: Commands) => commands.filter((command) => command._tag !== 'Snackbar')

/**
 * What a step told the snackbar: the notice standing after it, and how long it stands, as the snackbar was told it.
 * `None` when it was told nothing.
 */
const toldIn = (after: Whole, commands: Commands) => {
  const lastings = commands.flatMap((command) => command._tag === 'Snackbar' ? [command.command.lasting] : [])
  const [lasting] = lastings
  return lastings.length === 1 && lasting !== undefined
    ? Opt.map(standingOf(after), ({ notice }) => ({ notice, lasting }))
    : Opt.none()
}

/**
 * A message that cannot arrive in that state: a completion while no deletion is in progress, the end of the rows'
 * motion while none moves, a tick while no product expires, a press of the back button while no selection is shown.
 */
const cannotArrive = (msg: Message, { own }: Whole) =>
  ((msg._tag === 'Deleted' || msg._tag === 'DeleteFailed') && own.selection._tag !== 'Deleting')
  || (msg._tag === 'BackPressed' && !showsSelection(own))
  || (msg._tag === 'RowsSettled' && !isSettling(own))
  || (msg._tag === 'TimeChanged' && !hasExpiringProduct(own))

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
        return Equal.equals(after.own.maybeNow, Opt.some(now)) && onlyChanged(before.own, after.own, 'maybeNow')
          && Equal.equals(after.children, before.children)
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
        const failed = Msg.ListChanged({ result: Result.fail(new ProductsReadError({ cause })) })
        const { after, commands } = step(failed, before)
        return after.own.list._tag === 'Failed' && Opt.isNone(after.own.maybeNow)
          && onlyChanged(before.own, after.own, 'list', 'maybeNow')
          && Equal.equals(after.children, before.children)
          && commands.length === 0
      })
    })

    // The clock stops with the last product that expires, and starts anew with the next one.
    test('the time is kept while a product still expires, and forgotten otherwise', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        return Equal.equals(after.own.maybeNow, hasExpiringProduct(after.own) ? before.own.maybeNow : Opt.none())
      })
    })

    test('products are validated in order, without commands', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after, commands } = step(changed(stored), before)
        const { list } = after.own
        return list._tag === 'Loaded'
          && list.items.length === stored.length
          && stored.every((input, index) => {
            const item = list.items[index]
            return Opt.match(Domain.fromSnapshot(input), {
              onNone: () => item?._tag === 'Invalid' && item.id === input.id,
              onSome: (validated) =>
                item?._tag === 'Valid' && item.id === input.id && Equal.equals(item.product, validated),
            })
          })
          && onlyChanged(before.own, after.own, 'list', 'selection', 'maybeNow')
          && Equal.equals(after.children, before.children)
          && commands.length === 0
      })
    })

    // A list shown for the first time appears whole, rather than opening every row.
    test('the rows arriving are those new to a loaded list and those still arriving that are kept, and none in a list loaded anew', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        const expected = before.own.list._tag === 'Loaded'
          ? HashSet.union(
            HashSet.difference(listedIds(after.own), listedIds(before.own)),
            HashSet.intersection(arrivalsOf(before.own), listedIds(after.own)),
          )
          : HashSet.empty<Domain.ProductId>()
        return Equal.equals(arrivalsOf(after.own), expected)
      })
    })

    test('the rows leaving are the rows shown that the change took out, and none in a list loaded anew', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        const expected = before.own.list._tag === 'Loaded'
          ? HashSet.difference(HashSet.union(listedIds(before.own), departuresOf(before.own)), listedIds(after.own))
          : HashSet.empty<Domain.ProductId>()
        return Equal.equals(departuresOf(after.own), expected)
      })
    })

    test('the selection keeps exactly the selected products that still exist; a deletion is left alone', () => {
      assertProperty([state, storedProducts], (before, stored) => {
        const { after } = step(changed(stored), before)
        if (before.own.selection._tag === 'Deleting') {
          return Equal.equals(after.own.selection, before.own.selection)
        }
        const existingIds = HashSet.fromIterable(stored.map((input) => input.id))
        const kept = HashSet.intersection(selectedIds(before.own.selection), existingIds)
        return after.own.selection._tag === (HashSet.size(kept) === 0 ? 'Idle' : 'Selecting')
          && Equal.equals(selectedIds(after.own.selection), kept)
      })
    })
  })

  describe('ItemSelected and ItemDeselected', () => {
    // A loaded list and no deletion in progress, with a selection that may or may not be among its products.
    const changeable = wholeOf(
      fc.tuple(own, products(), fc.oneof(idle, selecting)).map(([base, items, selection]): State => ({
        ...base,
        list: { _tag: 'Loaded', items, arrivals: HashSet.empty(), departures: [] },
        selection,
      })),
    )

    test('select an unselected listed id, deselect a selected one, touch nothing else, and vibrate on a long press only', () => {
      assertProperty([changeable, id, gesture], (before, itemId, by) => {
        const wasSelected = HashSet.has(selectedIds(before.own.selection), itemId)
        fc.pre(wasSelected || HashSet.has(listedIds(before.own), itemId))
        const msg = wasSelected ? Msg.ItemDeselected({ id: itemId, by }) : Msg.ItemSelected({ id: itemId, by })
        const { after, commands } = step(msg, before)
        return HashSet.has(selectedIds(after.own.selection), itemId) === !wasSelected
          && onlyChanged(before.own, after.own, 'selection')
          && Equal.equals(after.children, before.children)
          && Equal.equals(commands, by === 'LongPress' ? [Cmd.Vibrate({ feedback: 'LongPress' })] : [])
      })
    })

    test('selecting then deselecting restores the state', () => {
      assertProperty([changeable, id, gesture, gesture], (before, itemId, selectedBy, deselectedBy) => {
        fc.pre(!HashSet.has(selectedIds(before.own.selection), itemId) && HashSet.has(listedIds(before.own), itemId))
        const selected = step(Msg.ItemSelected({ id: itemId, by: selectedBy }), before).after
        return Equal.equals(step(Msg.ItemDeselected({ id: itemId, by: deselectedBy }), selected).after, before)
      })
    })

    test('deselecting the last selected id leaves no selection', () => {
      assertProperty([changeable, id, gesture], (before, itemId, by) => {
        fc.pre(Equal.equals(selectedIds(before.own.selection), HashSet.make(itemId)))
        return step(Msg.ItemDeselected({ id: itemId, by }), before).after.own.selection._tag === 'Idle'
      })
    })

    test('are rejected when the id is already in the state they ask for', () => {
      assertProperty(
        [changeable, id, gesture],
        (before, itemId, by) =>
          HashSet.has(selectedIds(before.own.selection), itemId)
            ? rejects(Msg.ItemSelected({ id: itemId, by }), before)
            : rejects(Msg.ItemDeselected({ id: itemId, by }), before),
      )
    })

    // A tap on a row that the storage has meanwhile removed: the selection would otherwise hold a product that
    // is not in the list.
    test('selecting an id that is not in the list is rejected', () => {
      assertProperty([state, id, gesture], (before, itemId, by) => {
        fc.pre(!HashSet.has(listedIds(before.own), itemId))
        return rejects(Msg.ItemSelected({ id: itemId, by }), before)
      })
    })

    test('are rejected unless the list is loaded and nothing is being deleted', () => {
      assertProperty([state, id, gesture], (before, itemId, by) => {
        fc.pre(before.own.list._tag !== 'Loaded' || before.own.selection._tag === 'Deleting')
        return rejects(Msg.ItemSelected({ id: itemId, by }), before)
          && rejects(Msg.ItemDeselected({ id: itemId, by }), before)
      })
    })
  })

  describe('EditRequested', () => {
    /** The product listed under `id`, when it is a valid one. */
    const productUnder = (state: State, id: Domain.ProductId) =>
      state.list._tag === 'Loaded'
        ? Opt.fromNullishOr(state.list.items.find((item) => item._tag === 'Valid' && item.id === id))
        : Opt.none()

    test('asks to edit the listed product, as the row shows it, while nothing is selected, and changes nothing', () => {
      assertProperty([state, id], (before, itemId) => {
        const maybeItem = productUnder(before.own, itemId)
        fc.pre(before.own.selection._tag === 'Idle' && Opt.isSome(maybeItem))
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
        fc.pre(before.own.selection._tag !== 'Idle' || Opt.isNone(productUnder(before.own, itemId)))
        return rejects(Msg.EditRequested({ id: itemId }), before)
      })
    })
  })

  test('SelectionCleared empties the selection, or is rejected when there is none or the list is not loaded', () => {
    assertProperty([state], (before) => {
      if (before.own.list._tag !== 'Loaded' || before.own.selection._tag !== 'Selecting') {
        return rejects(Msg.SelectionCleared(), before)
      }
      const { after, commands } = step(Msg.SelectionCleared(), before)
      return after.own.selection._tag === 'Idle' && onlyChanged(before.own, after.own, 'selection')
        && Equal.equals(after.children, before.children)
        && commands.length === 0
    })
  })

  // As Material's contextual action bar; a deletion in progress holds the press, so that the app stays.
  test('BackPressed empties the selection, and changes nothing while it is being deleted', () => {
    assertProperty([state], (before) => {
      fc.pre(showsSelection(before.own))
      const { after, commands } = step(Msg.BackPressed(), before)
      return (before.own.selection._tag === 'Deleting'
        ? Equal.equals(after, before)
        : after.own.selection._tag === 'Idle' && onlyChanged(before.own, after.own, 'selection')
          && Equal.equals(after.children, before.children))
        && commands.length === 0
    })
  })

  describe('DeleteStarted', () => {
    test('deletes the selection, keeping its products, or is rejected when there is none or the list is not loaded', () => {
      assertProperty([state], (before) => {
        const { list, selection } = before.own
        if (list._tag !== 'Loaded' || selection._tag !== 'Selecting') {
          return rejects(Msg.DeleteStarted(), before)
        }
        const { after, commands } = step(Msg.DeleteStarted(), before)
        return Equal.equals(after.own.selection, {
          _tag: 'Deleting',
          ids: selection.ids,
          maybeProducts: productsOf(list.items, selection.ids),
        })
          && onlyChanged(before.own, after.own, 'selection')
          && Equal.equals(after.children, before.children)
          && Equal.equals(commands, [Cmd.Delete({ ids: selection.ids })])
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
    // The snackbar with "Undo" stands for Material's long duration, to reach for it; one without, the short one.
    test('clears the selection, tells the snackbar of the deletion and its products, for long while they can come back, and vibrates', () => {
      assertProperty([stateWith('selection', deleting)], (before) => {
        const { after, commands } = step(Msg.Deleted(), before)
        const { selection } = before.own
        return selection._tag === 'Deleting'
          && after.own.selection._tag === 'Idle'
          && onlyChanged(before.own, after.own, 'selection')
          && Equal.equals(
            toldIn(after, commands),
            Opt.some({
              notice: {
                _tag: 'Deleted',
                count: PositiveInteger.makeUnsafe(HashSet.size(selection.ids)),
                maybeProducts: selection.maybeProducts,
              },
              lasting: Opt.isSome(selection.maybeProducts) ? 'Long' : 'Short',
            }),
          )
          && Equal.equals(ownCommands(commands), [Cmd.Vibrate({ feedback: 'Confirm' })])
      })
    })

    // Only a completion leaves Deleting, so one that arrives elsewhere is a bug.
    test('is a defect when no deletion is in progress', () => {
      assertProperty([state], (before) => {
        fc.pre(before.own.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.Deleted())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  describe('DeleteFailed', () => {
    // Its snackbar replaces the one standing, an offer to undo included.
    test('gives the selection back, tells the snackbar of the failure, for a short while, and vibrates', () => {
      assertProperty([stateWith('selection', deleting)], (before) => {
        const { after, commands } = step(Msg.DeleteFailed(), before)
        return after.own.selection._tag === 'Selecting'
          && Equal.equals(selectedIds(after.own.selection), selectedIds(before.own.selection))
          && onlyChanged(before.own, after.own, 'selection')
          && Equal.equals(toldIn(after, commands), Opt.some({ notice: { _tag: 'DeleteFailed' }, lasting: 'Short' }))
          && Equal.equals(ownCommands(commands), [Cmd.Vibrate({ feedback: 'Reject' })])
      })
    })

    test('is a defect when no deletion is in progress', () => {
      assertProperty([state], (before) => {
        fc.pre(before.own.selection._tag !== 'Deleting')
        expect(() => program.update(Msg.DeleteFailed())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  describe('UndoRequested', () => {
    test('stores the deleted products again and dismisses the snackbar, while it offers to', () => {
      assertProperty([withStanding], (before) => {
        const { notice } = Opt.getOrThrow(standingOf(before))
        if (notice._tag !== 'Deleted' || Opt.isNone(notice.maybeProducts)) {
          return rejects(Msg.UndoRequested(), before)
        }
        const { after, commands, events } = step(Msg.UndoRequested(), before)
        return Opt.isNone(standingOf(after))
          && Equal.equals(after.own, before.own)
          && Equal.equals(commands, [Cmd.Restore({ products: notice.maybeProducts.value })])
          && events.length === 0
      })
    })

    test('is rejected when no snackbar stands', () => {
      assertProperty([withNone], (before) => rejects(Msg.UndoRequested(), before))
    })
  })

  // The snackbar leaves by itself: Products has nothing to do then.
  test('a snackbar that has stood its time leaves, and Products\' own state is the very same', () => {
    assertProperty([withStanding], (before) => {
      const { id } = Opt.getOrThrow(standingOf(before))
      const { after, commands, events } = step({ _tag: 'Snackbar', message: { _tag: 'Expired', id } }, before)
      return Opt.isNone(standingOf(after)) && after.own === before.own && commands.length === 0
        && events.length === 0
    })
  })

  describe('RowsSettled', () => {
    test('makes the arriving rows rows like the others, drops the leaving ones, forgets the time unless a product still expires, and touches nothing else', () => {
      assertProperty([state.filter((s) => isSettling(s.own))], (before) => {
        const { after, commands } = step(Msg.RowsSettled(), before)
        return before.own.list._tag === 'Loaded'
          && Equal.equals(after.own.list, { ...before.own.list, arrivals: HashSet.empty(), departures: [] })
          && Equal.equals(after.own.maybeNow, hasExpiringProduct(after.own) ? before.own.maybeNow : Opt.none())
          && onlyChanged(before.own, after.own, 'list', 'maybeNow')
          && Equal.equals(after.children, before.children)
          && commands.length === 0
      })
    })

    // The timer runs only while a row arrives or leaves, so its end heard otherwise is a bug.
    test('is a defect while no row arrives or leaves', () => {
      assertProperty([state.filter((s) => !isSettling(s.own))], (before) => {
        expect(() => program.update(Msg.RowsSettled())(before)).toThrow(Tea.InvariantDefect)
        return true
      })
    })
  })

  // The storage is as it was: there is nothing to give back but the news.
  test('RestoreFailed tells the snackbar of the failure, for a short while, vibrates, and changes nothing else', () => {
    assertProperty([state], (before) => {
      const { after, commands } = step(Msg.RestoreFailed(), before)
      return Equal.equals(toldIn(after, commands), Opt.some({ notice: { _tag: 'RestoreFailed' }, lasting: 'Short' }))
        && Equal.equals(after.own, before.own)
        && Equal.equals(ownCommands(commands), [Cmd.Vibrate({ feedback: 'Reject' })])
    })
  })
})

/** Whether the state lists that key among its own, by value. */
const listens = (state: Whole, key: unknown) => program.subscriptions(state).some((other) => Equal.equals(other, key))

// The storage is observed in every state; the clock ticks only for a product that expires; the rows' motion is timed
// by the rows arriving and leaving.
test('listens to the storage always, to the clock while a product shown expires, and times the rows moving', () => {
  assertProperty([state], (s) =>
    listens(s, 'changes') && listens(s, 'clock') === hasExpiringProduct(s.own)
    && isSettling(s.own)
      === listens(s, { _tag: 'Settling', arrivals: arrivalsOf(s.own), departures: departuresOf(s.own) }))
})

// Otherwise the press is Home's, or the platform's, which leaves the app.
test('observes the back button only while the list shows a selection', () => {
  assertProperty([state], (s) => listens(s, 'back-button') === showsSelection(s.own))
})

// A row's look and action, a product's status and the snackbar are decided here, not in the view.
describe('Products model', () => {
  /** The rows of a loaded list at a known time. */
  const rows = (state: Whole) => {
    const { list } = program.makeModel(state)
    return list._tag === 'Available' ? list.products : []
  }

  const isLeaving = (row: ProductModel) => row.presence === 'Leaving'

  /** The rows of the products listed, without the ones leaving. */
  const listedRows = (state: Whole) => rows(state).filter((row) => !isLeaving(row))

  /** A loaded list of products, with a time when one of them expires. */
  const loaded = wholeOf(
    fc.tuple(own, products({ minLength: 1 }).chain(loadedOf), maybe(zoned)).map(([base, list, maybeNow]): State => {
      const loaded: State = { ...base, list, maybeNow }
      return hasExpiringProduct(loaded) ? loaded : { ...loaded, maybeNow: Opt.none() }
    }),
  )

  const shown = loaded.filter((s) => !hasExpiringProduct(s.own) || Opt.isSome(s.own.maybeNow))

  // Nothing is drawn, rather than products without their status, or with one from a time that is not known.
  test('a loaded list is shown at once when no product expires, and once the clock has ticked otherwise', () => {
    assertProperty(
      [loaded],
      (s) =>
        (program.makeModel(s).list._tag === 'Available')
          === (!hasExpiringProduct(s.own) || Opt.isSome(s.own.maybeNow)),
    )
  })

  test('every stored product is a row, in order, with its kind, and every row leaving is one taken out, in order', () => {
    assertProperty([shown], (s) => {
      const items = s.own.list._tag === 'Loaded' ? s.own.list.items : []
      const departures = s.own.list._tag === 'Loaded' ? s.own.list.departures : []
      const listed = listedRows(s)
      const leaving = rows(s).filter(isLeaving)
      return listed.length === items.length && listed.every((row, index) => row._tag === items[index]?._tag)
        && Equal.equals(
          leaving.map((row) => row.id),
          departures.map(({ item }) => item.id),
        )
    })
  })

  // Deleting rows apart: the rows between them stay where they are while the others close their place.
  test('rows taken out stay where they were while they leave, and rows put back arrive there', () => {
    const changed = (ns: ReadonlyArray<number>) =>
      Msg.ListChanged({ result: Result.succeed(storedWith(ns.map(ProductArbitrary.nthId))) })
    const presences = (s: Whole) => rows(s).map((row) => `${row.id}:${row.presence}`)
    const loaded = step(changed([1, 2, 3, 4, 5]), program.init.state).after
    const deleted = step(changed([1, 3, 5]), loaded).after
    const restored = step(changed([1, 2, 3, 5]), deleted).after
    expect(presences(loaded)).toEqual(['1:Listed', '2:Listed', '3:Listed', '4:Listed', '5:Listed'])
    expect(presences(deleted)).toEqual(['1:Listed', '2:Leaving', '3:Listed', '4:Leaving', '5:Listed'])
    expect(presences(restored)).toEqual(['1:Listed', '2:Arriving', '3:Listed', '4:Leaving', '5:Listed'])
    expect(presences(step(Msg.RowsSettled(), restored).after)).toEqual(['1:Listed', '2:Listed', '3:Listed', '5:Listed'])
  })

  test('a row is selected exactly when its id is, and a long press toggles its selection unless a deletion is in progress or it leaves', () => {
    assertProperty([shown], (s) => {
      const selected = selectedIds(s.own.selection)
      return rows(s).every((row) => {
        if (row.presence === 'Leaving') return !row.selection.isSelected && Opt.isNone(row.selection.maybeToggle)
        const isSelected = HashSet.has(selected, row.id)
        const expectedToggle = s.own.selection._tag === 'Deleting'
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
        const expected = s.own.selection._tag === 'Selecting'
          ? Opt.map(
            row.selection.maybeToggle,
            () =>
              row.selection.isSelected
                ? Msg.ItemDeselected({ id: row.id, by: 'Tap' })
                : Msg.ItemSelected({ id: row.id, by: 'Tap' }),
          )
          : s.own.selection._tag === 'Idle' && row._tag === 'Valid' && row.presence !== 'Leaving'
          ? Opt.some(Msg.EditRequested({ id: row.id }))
          : Opt.none()
        return Equal.equals(row.selection.maybeTap, expected)
      }))
  })

  test('a listed row arrives exactly when its id does', () => {
    assertProperty(
      [shown],
      (s) => listedRows(s).every((row) => (row.presence === 'Arriving') === HashSet.has(arrivalsOf(s.own), row.id)),
    )
  })

  test('the rows that stay close up while a row leaves, open while one arrives and none leaves, and are still otherwise', () => {
    assertProperty([shown], (s) => {
      const { list } = program.makeModel(s)
      const expected = HashSet.size(departuresOf(s.own)) > 0
        ? 'Closing'
        : HashSet.size(arrivalsOf(s.own)) > 0
        ? 'Opening'
        : 'Still'
      return list._tag !== 'Available' || list.settling === expected
    })
  })

  /** A loaded list of one product, at a time within a week before its expiration day, where the statuses differ. */
  const dueWithinAWeek = wholeOf(
    fc.tuple(
      own,
      ProductArbitrary.arbitrary.filter((product) => Opt.isSome(product.maybeExpirationDate)),
      zone,
      fc.integer({ min: 0, max: 6 }),
      // Less than the shortest day a clock change makes.
      fc.integer({ min: 0, max: 22 * 60 }),
    ).chain(([base, product, timeZone, daysBefore, minutes]) => {
      const expirationDate = Opt.getOrThrow(product.maybeExpirationDate)
      const now = Day.startIn(Day.addDays(expirationDate, -daysBefore), timeZone).pipe(DateTime.add({ minutes }))
      return loadedOf([{ _tag: 'Valid', id: ProductArbitrary.nthId(1), product }]).map((list): State => ({
        ...base,
        list,
        maybeNow: Opt.some(now),
      }))
    }),
  )

  /** Whether each listed row of a valid product has the status the domain gives it at the state's time. */
  const hasDomainStatus = (s: Whole) => {
    const items = s.own.list._tag === 'Loaded' ? s.own.list.items : []
    return listedRows(s).every((row, index) => {
      const item = items[index]
      if (row._tag !== 'Valid' || item?._tag !== 'Valid') return row._tag === item?._tag
      return Opt.match(Domain.maybeExpiration(item.product), {
        onNone: () => row.status._tag === 'Everlasting',
        onSome: (expiration) => {
          // A product that expires is shown only at a known time.
          const status = Domain.expirationStatus(Opt.getOrThrow(s.own.maybeNow))(expiration)
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
            : (row.status._tag === 'ExpiringSoon' || row.status._tag === 'Fresh')
              && row.status._tag === (daysUntilExpiration <= 3 ? 'ExpiringSoon' : 'Fresh')
              && row.status.inDays === daysUntilExpiration
              && row.status.freshness === status.freshness
        },
      })
    })
  }

  test('a valid product expired yesterday the day after its expiration day, is stale later, expiring today on that day, tomorrow on the day before, soon up to three days ahead, fresh earlier, and keeps the domain\'s freshness', () => {
    assertProperty([shown], hasDomainStatus)
  })

  test('a valid product within a week of its expiration day has the status of the days left, soon up to three days ahead', () => {
    assertProperty([dueWithinAWeek], hasDomainStatus)
  })

  // Whatever the list shows: the last products may have just been deleted.
  test('the snackbar is the one standing, coming as it says, with the way to undo a deletion when its products can come back', () => {
    assertProperty([state], (s) =>
      Equal.equals(
        program.makeModel(s).snackbar,
        Opt.map(standingOf(s), ({ id, notice, entrance }) => ({
          id,
          entrance,
          notice: notice._tag === 'Deleted'
            ? {
              _tag: 'Deleted',
              count: notice.count,
              maybeUndo: Opt.map(notice.maybeProducts, () => Msg.UndoRequested()),
            }
            : notice,
        })),
      ))
  })

  // Two equal states built apart, by the same seed drawn twice: a function in a model would break it.
  test('is data: equal states, built apart, have equal models', () => {
    assertProperty([fc.integer()], (seed) => {
      const [one] = fc.sample(state, { seed, numRuns: 1 })
      const [other] = fc.sample(state, { seed, numRuns: 1 })
      return one !== undefined && other !== undefined && one !== other
        && Equal.equals(program.makeModel(one), program.makeModel(other))
    })
  })
})

// Guards against the arbitraries silently collapsing to trivial values.
test('arbitraries cover every variant of the state', () => {
  const tags = new Set(
    fc.sample(state, 500).flatMap((s) => {
      const maybeStanding = standingOf(s)
      return [
        `list:${s.own.list._tag}`,
        `selection:${s.own.selection._tag}`,
        `now:${s.own.maybeNow._tag}`,
        `snackbar:${Opt.match(maybeStanding, { onNone: () => 'None', onSome: ({ notice }) => notice._tag })}`,
        ...Opt.toArray(
          Opt.flatMap(
            maybeStanding,
            ({ notice }) =>
              notice._tag === 'Deleted' ? Opt.some(`restorable:${notice.maybeProducts._tag}`) : Opt.none(),
          ),
        ),
        ...(s.own.list._tag === 'Loaded'
          ? [
            `arrivals:${HashSet.size(s.own.list.arrivals) > 0 ? 'Some' : 'None'}`,
            `departures:${s.own.list.departures.length > 0 ? 'Some' : 'None'}`,
          ]
          : []),
      ]
    }),
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
