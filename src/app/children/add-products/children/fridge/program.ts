// The fridge that the products added enter (`docs/product-flight.md`): away, open while any is on its way, then
// closing behind the last. Its page tells it each product added, with the day of the page's clock. Its timers end
// the phases.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Duration from 'effect/Duration'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#domain/product.ts'
import * as Day from '#libs/dates/day.ts'
import { duration } from '#libs/material/durations.ts'
import { after } from '#libs/timers/timers.ts'

/** Whether the fridge appeared with a product, or was there already. */
export type Entrance = 'WithFridge' | 'IntoOpenFridge'

/**
 * A product added, on its way into the fridge. `id` is its number among those added. `addedOn` is the day of the
 * page's clock as it was added.
 */
export type Arrival = Readonly<{ id: number; product: Product.Product; addedOn: Day.Day; entrance: Entrance }>

/** A visit is named by the first product's id, so that a fridge that comes back is drawn anew. */
export type Fridge = Data.TaggedEnum<{
  Away: object
  /** `opening` says whether the door opens as the fridge appears, or again, as it was closing. */
  Open: Readonly<{ visit: number; opening: 'WithFridge' | 'Again'; arrivals: Arr.NonEmptyReadonlyArray<Arrival> }>
  /** The door closes behind `last` and the fridge settles; then it goes. */
  Closing: Readonly<{ visit: number; last: Arrival }>
}>

export type State = Readonly<{
  /** How many products this visit of the page has added: each one's arrival goes by its number. */
  added: number
  fridge: Fridge
}>

/** What the page tells: a product added, and the day of its clock then. */
export type External = Readonly<{ _tag: 'Admitted'; product: Product.Product; today: Day.Day }>

export type Message = Data.TaggedEnum<{
  // From subscriptions.
  /** The product added as the `id`th is in the fridge. */
  Arrived: { id: number }
  /** The fridge has closed behind the product added as the `id`th, and settled. */
  FridgeClosed: { id: number }
}>

const Message = Data.taggedEnum<Message>()

/**
 * An arrival's timer is keyed by its id, with its entrance, which says how long it lasts; the closing's by the last
 * arrival's id. The next one starts it anew.
 */
export type Key = Data.TaggedEnum<{
  Arriving: { id: number; entrance: Entrance }
  Closing: { id: number }
}>

const Key = Data.taggedEnum<Key>()

/**
 * When a product entering the fridge is due, as the disc of its row in Home's list tells it, by the days left
 * (`docs/freshness.md`). A product just added has not expired: one whose day ends during its flight is due now.
 */
export type Due = Data.TaggedEnum<{
  Never: object
  /** Today or tomorrow. */
  Now: Readonly<{ expirationDate: Day.Day }>
  /** Within `Product.SOON_DAYS`. */
  Soon: Readonly<{ expirationDate: Day.Day }>
  Later: Readonly<{ expirationDate: Day.Day }>
}>

/** A product on its way into the fridge, as its disc. */
export type ArrivalShown = Readonly<{ id: number; product: Product.Product; entrance: Entrance; due: Due }>

export type Model = Data.TaggedEnum<{
  Away: object
  Open: Readonly<{ visit: number; opening: 'WithFridge' | 'Again'; arrivals: Arr.NonEmptyReadonlyArray<ArrivalShown> }>
  /** `last` is the product the door closes behind. */
  Closing: Readonly<{ visit: number; last: Product.Product }>
}>

// The phases of `docs/product-flight.md`, which the view's motion must fit in: what it draws is removed when they
// end. A product's flight comes after the fridge's appearance when it brings the fridge. The door closes, then the
// fridge settles.
const ARRIVAL_DURATIONS: Readonly<Record<Entrance, Duration.Duration>> = {
  WithFridge: Duration.millis(duration.medium2 + duration.long2),
  IntoOpenFridge: Duration.millis(duration.long2),
}

const CLOSING_DURATION = Duration.millis(duration.short4 + duration.medium1)

/** When a product is due, by the days from `today`. */
const dueOf = (today: Day.Day, { maybeExpirationDate }: Product.Product): Due =>
  Opt.match(maybeExpirationDate, {
    onNone: (): Due => ({ _tag: 'Never' }),
    onSome: (expirationDate): Due => {
      const days = Day.daysBetween(today, expirationDate)
      return days <= 1
        ? { _tag: 'Now', expirationDate }
        : days <= Product.SOON_DAYS
        ? { _tag: 'Soon', expirationDate }
        : { _tag: 'Later', expirationDate }
    },
  })

/** The fridge with a product added: it appears with the first, stays open for the next, and opens again for one. */
const admitted = (fridge: Fridge, coming: Omit<Arrival, 'entrance'>): Fridge =>
  Match.valueTags(fridge, {
    Away: (): Fridge => ({
      _tag: 'Open',
      visit: coming.id,
      opening: 'WithFridge',
      arrivals: [{ ...coming, entrance: 'WithFridge' }],
    }),
    Open: (open): Fridge => ({
      ...open,
      arrivals: Arr.append(open.arrivals, { ...coming, entrance: 'IntoOpenFridge' }),
    }),
    Closing: ({ visit }): Fridge => ({
      _tag: 'Open',
      visit,
      opening: 'Again',
      arrivals: [{ ...coming, entrance: 'IntoOpenFridge' }],
    }),
  })

const { make } = Tea.program<{ state: State; model: Model; message: Message; external: External; key: Key }>()

export const program = make({
  init: { state: { added: 0, fridge: { _tag: 'Away' } } },

  // Two products added within a second have the same creation date: their numbers tell them apart.
  external: ({ product, today }) => (state) => ({
    state: { added: state.added + 1, fridge: admitted(state.fridge, { id: state.added, product, addedOn: today }) },
  }),

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State>>()({
    // The door stays open while another product is on its way.
    Arrived: ({ id }) => (state) => {
      const { fridge } = state
      const maybeArrival = fridge._tag === 'Open'
        ? Arr.findFirst(fridge.arrivals, (arrival) => arrival.id === id)
        : Opt.none()
      if (fridge._tag !== 'Open' || Opt.isNone(maybeArrival)) {
        return Tea.defect('Arrived for a product not on its way: its timer runs only while it is, keyed by its id')
      }
      const arrivals = Arr.filter(fridge.arrivals, (arrival) => arrival.id !== id)
      const next: Fridge = Arr.isReadonlyArrayNonEmpty(arrivals)
        ? { ...fridge, arrivals }
        : { _tag: 'Closing', visit: fridge.visit, last: maybeArrival.value }
      return { state: { ...state, fridge: next } }
    },

    FridgeClosed: ({ id }) => (state) =>
      state.fridge._tag === 'Closing' && state.fridge.last.id === id
        ? { state: { ...state, fridge: { _tag: 'Away' } } }
        : Tea.defect(
          'FridgeClosed while the fridge is not closing behind that product: its timer runs only while it is',
        ),
  }),

  subscriptions: (state) =>
    Match.valueTags(state.fridge, {
      Away: (): ReadonlyArray<Key> => [],
      Open: ({ arrivals }): ReadonlyArray<Key> => arrivals.map(({ id, entrance }) => Key.Arriving({ id, entrance })),
      Closing: ({ last }): ReadonlyArray<Key> => [Key.Closing({ id: last.id })],
    }),

  listen: Match.typeTags<Key, Tea.Subscription<Message>>()({
    Arriving: ({ id, entrance }) => after(ARRIVAL_DURATIONS[entrance], Message.Arrived({ id })),
    Closing: ({ id }) => after(CLOSING_DURATION, Message.FridgeClosed({ id })),
  }),

  // A product just added is due by the day it was added on: the fridge needs no clock.
  makeModel: (state) =>
    Match.valueTags(state.fridge, {
      Away: (): Model => ({ _tag: 'Away' }),
      Open: ({ visit, opening, arrivals }): Model => ({
        _tag: 'Open',
        visit,
        opening,
        arrivals: Arr.map(arrivals, ({ id, product, entrance, addedOn }) => ({
          id,
          product,
          entrance,
          due: dueOf(addedOn, product),
        })),
      }),
      Closing: ({ visit, last }): Model => ({ _tag: 'Closing', visit, last: last.product }),
    }),
})
