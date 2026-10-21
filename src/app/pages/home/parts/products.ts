// The stored products, as of the latest change of the storage, and the selection
// of some of them for deletion. The selection follows the list, so they are one part.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Domain from '#app/domain/product.ts'
import * as ProductCommands from '#app/ports/product-commands.ts'
import * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import type * as UnitInterval from '#libs/numbers/unit-interval.ts'
import { ProductList, type StoredProduct } from '../ports/product-list.ts'

export type Product = Data.TaggedEnum<{
  /** Stored data so broken it cannot even be referenced. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  /** Stored with an id, but not a valid product: it can still be selected and deleted. */
  Invalid: Readonly<{ id: string; maybeName: Opt.Option<string> }>
  Valid: Readonly<{ id: string; product: Domain.Product }>
}>

const Product = Data.taggedEnum<Product>()

export type State = Readonly<{
  /** The current time, once the clock has ticked: expiration statuses derive from it. */
  maybeNow: Opt.Option<DateTime.Utc>
  list: Data.TaggedEnum<{
    Loading: object
    Failed: object
    Loaded: Readonly<{ items: ReadonlyArray<Product> }>
  }>
  selection: Data.TaggedEnum<{
    Selecting: Readonly<{ maybeIds: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>> }>
    // Left only by its completion: with commands that cannot be cancelled, a
    // completion always belongs to the deletion in progress, so it needs no id.
    Deleting: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string> }>
  }>
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  ItemSelected: { id: string }
  ItemDeselected: { id: string }
  SelectionCleared: object
  DeleteStarted: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  ListChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, void> }
  // From commands.
  DeleteCompleted: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{ Delete: { ids: NonEmptyHashSet.NonEmptyHashSet<string> } }>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{ DeleteFailed: object }>

const Event = Data.taggedEnum<Event>()

/** What a tap on a product does. */
export type ItemSelection = Data.TaggedEnum<{
  Unselected: { select: Tea.Offered<Message> }
  Selected: { deselect: Tea.Offered<Message> }
  /** The selected products are being deleted: nothing can be selected meanwhile. */
  Deleting: { isSelected: boolean }
}>

export type ProductModel = Data.TaggedEnum<{
  /** Cannot be referenced, so nothing can be done with it. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  Invalid: Readonly<{ id: string; selection: ItemSelection; maybeName: Opt.Option<string> }>
  Valid: Readonly<{
    id: string
    selection: ItemSelection
    name: string
    status: Data.TaggedEnum<{
      Everlasting: object
      Stale: Readonly<{ expirationDate: DateTime.Utc }>
      Fresh: Readonly<{
        expirationDate: DateTime.Utc
        timeLeft: Duration.Duration
        freshnessRatio: UnitInterval.UnitInterval
      }>
    }>
  }>
}>

export type Model = Data.TaggedEnum<{
  /** Until both the list and the time are known. */
  Initial: object
  Error: object
  Empty: object
  Available: Readonly<{
    deletion: Data.TaggedEnum<{
      NothingSelected: object
      Possible: {
        count: PositiveInteger.PositiveInteger
        deleteSelected: Tea.Offered<Message>
        clearSelection: Tea.Offered<Message>
      }
      InProgress: object
    }>
    total: PositiveInteger.PositiveInteger
    products: Arr.NonEmptyReadonlyArray<ProductModel>
  }>
}>

// Products that still have an id can be selected and deleted, even when invalid;
// the ones without an id cannot be referenced at all.
const validate = (stored: StoredProduct): Product =>
  Opt.match(stored.maybeId, {
    onNone: () => Product.Corrupt({ maybeName: stored.maybeName }),
    onSome: (id) =>
      Opt.match(Domain.fromSnapshot(stored), {
        onNone: () => Product.Invalid({ id, maybeName: stored.maybeName }),
        onSome: (product) => Product.Valid({ id, product }),
      }),
  })

const idsOf = (items: ReadonlyArray<Product>) =>
  HashSet.fromIterable(Arr.flatMap(items, (product) => (product._tag === 'Corrupt' ? [] : [product.id])))

type Selecting = Data.TaggedEnum.Value<State['selection'], 'Selecting'>
type Loaded = Data.TaggedEnum.Value<State['list'], 'Loaded'>
type WithSelection = Selecting & { readonly maybeIds: Opt.Some<NonEmptyHashSet.NonEmptyHashSet<string>> }

const canChangeSelection = (state: State): state is State & { readonly list: Loaded; readonly selection: Selecting } =>
  state.list._tag === 'Loaded' && state.selection._tag === 'Selecting'

const hasSelection = (state: State): state is State & { readonly selection: WithSelection } =>
  state.selection._tag === 'Selecting' && Opt.isSome(state.selection.maybeIds)

const isSelected = (selection: Selecting, id: string) => Opt.exists(selection.maybeIds, HashSet.has(id))

// Expiration statuses derive from the current time: it is refreshed often
// enough for days-long expirations.
const clock = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('30 seconds'))),
  ),
)

const changes = Channel.unwrap(
  Effect.map(
    Effect.service(ProductList),
    ({ changes }) => Channel.map(changes, (result) => Message.ListChanged({ result })),
  ),
)

const deleteProducts = ({ ids }: Readonly<{ ids: NonEmptyHashSet.NonEmptyHashSet<string> }>) =>
  Tea.attempt(
    Effect.gen(function*() {
      const { deleteById } = yield* ProductCommands.ProductCommands
      yield* Effect.logDebug('Deleting products', { count: HashSet.size(ids) })
      yield* pipe(
        ids,
        HashSet.map((id) => ProductCommands.DeleteProductById({ id })),
        Effect.forEach(Effect.request(deleteById), { concurrency: 'unbounded', discard: true }),
        // The storage logs the cause.
        Effect.tapError(() => Effect.logWarning('Could not delete the products')),
      )
      yield* Effect.logInfo('Deleted products', { count: HashSet.size(ids) })
    }),
    {
      onSuccess: () => Message.DeleteCompleted({ succeeded: true }),
      onFailure: () => Message.DeleteCompleted({ succeeded: false }),
    },
  ).pipe(Effect.withLogSpan('DeleteProducts'))

type ProductStatus = Data.TaggedEnum.Value<ProductModel, 'Valid'>['status']

const statusAt = (now: DateTime.Utc, product: Domain.Product): ProductStatus =>
  Opt.match(Domain.maybeExpiration(product), {
    onNone: () => ({ _tag: 'Everlasting' }),
    onSome: (expiration) => {
      const { expirationDate } = expiration
      const status = Domain.expirationStatus(now)(expiration)
      return status.hasExpired
        ? { _tag: 'Stale', expirationDate }
        : { _tag: 'Fresh', expirationDate, timeLeft: status.timeLeft, freshnessRatio: status.freshness }
    },
  })

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: ProductCommands.ProductCommands | ProductList
  event: Event
}> = {
  init: {
    state: {
      maybeNow: Opt.none(),
      list: { _tag: 'Loading' },
      selection: { _tag: 'Selecting', maybeIds: Opt.none() },
    },
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    ListChanged: ({ result }) => (state) => {
      if (Result.isFailure(result)) {
        return { state: { ...state, list: { _tag: 'Failed' } } }
      }
      const items = Arr.map(result.success, validate)
      return {
        state: {
          ...state,
          list: { _tag: 'Loaded', items },
          // The selection keeps the products that still exist; a deletion in
          // progress is left alone.
          selection: state.selection._tag === 'Selecting'
            ? {
              _tag: 'Selecting',
              maybeIds: Opt.flatMap(
                state.selection.maybeIds,
                (ids) => NonEmptyHashSet.make(HashSet.intersection(ids, idsOf(items))),
              ),
            }
            : state.selection,
        },
      }
    },

    TimeChanged: ({ now }) => (state) => ({ state: { ...state, maybeNow: Opt.some(now) } }),

    ItemSelected: ({ id }) => (state) => {
      if (!canChangeSelection(state) || isSelected(state.selection, id)) {
        return Tea.reject
      }
      const ids = Opt.match(state.selection.maybeIds, {
        onNone: () => HashSet.make(id),
        onSome: HashSet.add(id),
      })
      return {
        state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.some(NonEmptyHashSet.makeUnsafe(ids)) } },
      }
    },

    ItemDeselected: ({ id }) => (state) => {
      if (!canChangeSelection(state) || !hasSelection(state) || !isSelected(state.selection, id)) {
        return Tea.reject
      }
      const maybeIds = NonEmptyHashSet.make(HashSet.remove(state.selection.maybeIds.value, id))
      return { state: { ...state, selection: { _tag: 'Selecting', maybeIds } } }
    },

    SelectionCleared: () => (state) =>
      hasSelection(state)
        ? { state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.none() } } }
        : Tea.reject,

    DeleteStarted: () => (state) => {
      if (!(state.list._tag === 'Loaded' && hasSelection(state))) {
        return Tea.reject
      }
      const ids = state.selection.maybeIds.value
      return {
        state: { ...state, selection: { _tag: 'Deleting', ids } },
        commands: [Command.Delete({ ids })],
      }
    },

    DeleteCompleted: ({ succeeded }) => (state) => {
      if (state.selection._tag !== 'Deleting') {
        return Tea.reject
      }
      return succeeded
        ? { state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.none() } } }
        : {
          state: { ...state, selection: { _tag: 'Selecting', maybeIds: Opt.some(state.selection.ids) } },
          events: [Event.DeleteFailed()],
        }
    },
  }),

  runCommand: Match.typeTags<Command>()({
    Delete: deleteProducts,
  }),

  subscriptions: () => HashMap.make(['clock', clock], ['changes', changes]),

  makeModel: (state, { offer }) => {
    if (state.list._tag === 'Loading' || Opt.isNone(state.maybeNow)) {
      return { _tag: 'Initial' }
    }
    const now = state.maybeNow.value
    if (state.list._tag === 'Failed') {
      return { _tag: 'Error' }
    }
    const items = state.list.items
    if (!Arr.isReadonlyArrayNonEmpty(items)) {
      return { _tag: 'Empty' }
    }
    const { selection } = state
    const selectionOf = (id: string): ItemSelection => {
      if (selection._tag === 'Deleting') {
        return { _tag: 'Deleting', isSelected: HashSet.has(selection.ids, id) }
      }
      return Opt.exists(selection.maybeIds, HashSet.has(id))
        ? { _tag: 'Selected', deselect: offer(Message.ItemDeselected({ id })) }
        : { _tag: 'Unselected', select: offer(Message.ItemSelected({ id })) }
    }
    return {
      _tag: 'Available',
      deletion: selection._tag === 'Deleting'
        ? { _tag: 'InProgress' }
        : Opt.match(selection.maybeIds, {
          onNone: () => ({ _tag: 'NothingSelected' }),
          onSome: (ids) => ({
            _tag: 'Possible',
            count: PositiveInteger.makeUnsafe(HashSet.size(ids)),
            deleteSelected: offer(Message.DeleteStarted()),
            clearSelection: offer(Message.SelectionCleared()),
          }),
        }),
      total: PositiveInteger.makeUnsafe(items.length),
      products: Arr.map(items, (product): ProductModel => {
        switch (product._tag) {
          case 'Corrupt':
            return { _tag: 'Corrupt', maybeName: product.maybeName }
          case 'Invalid':
            return { _tag: 'Invalid', id: product.id, selection: selectionOf(product.id), maybeName: product.maybeName }
          case 'Valid':
            return {
              _tag: 'Valid',
              id: product.id,
              selection: selectionOf(product.id),
              name: product.product.name,
              status: statusAt(now, product.product),
            }
        }
      }),
    }
  },
}
