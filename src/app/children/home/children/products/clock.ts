// The clock of `Products`: the current time, which the statuses of the products that expire derive from. It runs
// only while a product shown, listed or leaving, expires: `None` until it has ticked, and again once no product
// needs it.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Domain from '#domain/product.ts'
import type * as Day from '#libs/dates/day.ts'
import * as PositiveInteger from '#libs/numbers/positive-integer.ts'
import type * as UnitInterval from '#libs/numbers/unit-interval.ts'
import { every } from '#libs/timers/timers.ts'
import type { Product } from './list.ts'
import type { State, Step, Transition } from './program.ts'

export type Message = Data.TaggedEnum<{
  TimeChanged: { now: DateTime.Zoned }
}>

const Message = Data.taggedEnum<Message>()

export type Key = 'clock'

/** How much of a product's life is left, from its creation to the end of its expiration day. */
type Freshness = UnitInterval.UnitInterval

export type ProductStatus = Data.TaggedEnum<{
  Everlasting: object
  /** Expired `daysAgo` days ago, two at least: yesterday has a case of its own. */
  Stale: Readonly<{ expirationDate: Day.Day; daysAgo: PositiveInteger.PositiveInteger }>
  /** Good through yesterday, and no longer today. */
  ExpiredYesterday: Readonly<{ expirationDate: Day.Day }>
  /** Good through today, and no longer tomorrow. */
  ExpiringToday: Readonly<{ expirationDate: Day.Day; freshness: Freshness }>
  /** Good through tomorrow. */
  ExpiringTomorrow: Readonly<{ expirationDate: Day.Day; freshness: Freshness }>
  /** Good through the day `inDays` days ahead, two at least and `Domain.SOON_DAYS` at most. */
  ExpiringSoon: Readonly<{ expirationDate: Day.Day; inDays: PositiveInteger.PositiveInteger; freshness: Freshness }>
  /** Good through the day `inDays` days ahead, more than `Domain.SOON_DAYS`. */
  Fresh: Readonly<{ expirationDate: Day.Day; inDays: PositiveInteger.PositiveInteger; freshness: Freshness }>
}>

const expires = (item: Product) => item._tag === 'Valid' && Opt.isSome(item.product.maybeExpirationDate)

/** Whether the time is needed: while a product shown expires, listed or leaving. */
const needsClock = ({ list }: State) =>
  list._tag === 'Loaded'
  && (Arr.some(list.items, expires) || Arr.some(list.departures, (departure) => expires(departure.item)))

// Expiration statuses derive from the current time: it is refreshed often
// enough for days-long expirations.
export const clock: Tea.Subscription<Message, DateTime.CurrentTimeZone> = every(
  '30 seconds',
  (now) => Message.TimeChanged({ now }),
)

export const subscriptions = (state: State): ReadonlyArray<Key> => needsClock(state) ? ['clock'] : []

export const update = Match.typeTags<Message, (state: State) => Transition>()({
  TimeChanged: ({ now }) => (state) =>
    needsClock(state)
      ? { state: { ...state, maybeNow: Opt.some(now) } }
      : Tea.defect('TimeChanged while no listed product expires: the clock runs only while one does'),
})

/** The clock stops with the last product that expires: the time it told goes with it. */
export const listChanged = (state: State): Step => ({
  state: needsClock(state) ? state : { ...state, maybeNow: Opt.none() },
})

const expirationStatusAt = (now: DateTime.Zoned, expiration: Domain.Expiration): ProductStatus => {
  const { expirationDate } = expiration
  const status = Domain.expirationStatus(now)(expiration)
  if (status.hasExpired) {
    const { daysSinceExpiration } = status
    return daysSinceExpiration === 1
      ? { _tag: 'ExpiredYesterday', expirationDate }
      : { _tag: 'Stale', expirationDate, daysAgo: PositiveInteger.makeUnsafe(daysSinceExpiration) }
  }
  const { freshness, daysUntilExpiration } = status
  switch (daysUntilExpiration) {
    case 0:
      return { _tag: 'ExpiringToday', expirationDate, freshness }
    case 1:
      return { _tag: 'ExpiringTomorrow', expirationDate, freshness }
    default: {
      const inDays = PositiveInteger.makeUnsafe(daysUntilExpiration)
      return inDays <= Domain.SOON_DAYS
        ? { _tag: 'ExpiringSoon', expirationDate, inDays, freshness }
        : { _tag: 'Fresh', expirationDate, inDays, freshness }
    }
  }
}

/** The status of a product: `None` for one that expires while the clock has not ticked yet. */
export const maybeStatusAt = (
  maybeNow: Opt.Option<DateTime.Zoned>,
  product: Domain.Product,
): Opt.Option<ProductStatus> =>
  Opt.match(Domain.maybeExpiration(product), {
    onNone: () => Opt.some({ _tag: 'Everlasting' }),
    onSome: (expiration) => Opt.map(maybeNow, (now) => expirationStatusAt(now, expiration)),
  })
