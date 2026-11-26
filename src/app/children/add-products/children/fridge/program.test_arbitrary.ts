import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import type * as Product from '#domain/product.ts'
import { arbitrary as day } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import type { Arrival, Entrance, External, Fridge, Message, State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

// Added on any day, or on one of the days before its expiration, as a product is most often.
const arrival = (id: number): fc.Arbitrary<Arrival> =>
  fc.record({
    product,
    anyDay: day,
    daysLeft: fc.oneof(fc.constant(-1), fc.nat({ max: 10 })),
    entrance: fc.constantFrom<Entrance>('WithFridge', 'IntoOpenFridge'),
  }).map(({ product, anyDay, daysLeft, entrance }) => ({
    id,
    product,
    addedOn: Opt.match(product.maybeExpirationDate, {
      onNone: () => anyDay,
      onSome: (date) => daysLeft < 0 ? anyDay : Day.addDays(date, -daysLeft),
    }),
    entrance,
  }))

/**
 * The fridge, and how many products the page has added: each product in it has an id below that count, its own,
 * and the visit is named by an id no greater than theirs.
 */
export const state: fc.Arbitrary<State> = fc.oneof(
  fc.nat({ max: 9 }).map((added): State => ({ added, fridge: { _tag: 'Away' } })),
  fc.uniqueArray(fc.nat({ max: 9 }), { minLength: 1, maxLength: 4 }).chain((ids) => {
    const sorted = ids.toSorted((a, b) => a - b)
    return fc.tuple(
      fc.tuple(...sorted.map(arrival)),
      fc.nat({ max: sorted[0] ?? 0 }),
      fc.constantFrom<'WithFridge' | 'Again'>('WithFridge', 'Again'),
      fc.nat({ max: 2 }),
    ).map(([arrivals, visit, opening, more]): State => ({
      added: (sorted[sorted.length - 1] ?? 0) + 1 + more,
      fridge: Arr.isReadonlyArrayNonEmpty(arrivals) ? { _tag: 'Open', visit, opening, arrivals } : { _tag: 'Away' },
    }))
  }),
  fc.nat({ max: 9 }).chain((id) =>
    fc.tuple(arrival(id), fc.nat({ max: id }), fc.nat({ max: 2 })).map((
      [last, visit, more],
    ): State => ({ added: id + 1 + more, fridge: { _tag: 'Closing', visit, last } }))
  ),
)

/** The last product added, while the fridge shows it. */
export const lastIn = (fridge: Fridge): Opt.Option<Product.Product> =>
  fridge._tag === 'Open'
    ? Opt.some(Arr.lastNonEmpty(fridge.arrivals).product)
    : fridge._tag === 'Closing'
    ? Opt.some(fridge.last.product)
    : Opt.none()

export const external: fc.Arbitrary<External> = fc.tuple(product, day).map(([product, today]) => ({
  _tag: 'Admitted',
  product,
  today,
}))

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.nat({ max: 12 }).map((id) => Msg.Arrived({ id })),
  fc.nat({ max: 12 }).map((id) => Msg.FridgeClosed({ id })),
)
