import * as Brand from 'effect/Brand'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import * as Day from '#libs/dates/day.ts'
import * as UnitInterval from '#libs/numbers/unit-interval.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'

/** A product that follows every rule of a product: only `make` and `fromSnapshot` can make one. */
export type Product = Brand.Branded<
  Readonly<{
    name: NormalizedString.NormalizedString
    creationDate: DateTime.Utc
    maybeExpirationDate: Opt.Option<Day.Day>
  }>,
  'Product'
>

const _Product = Brand.nominal<Product>()

/** The expiration of a product: the day it is good through, and when the product was created. */
export type Expiration = Brand.Branded<
  Readonly<{ creationDate: DateTime.Utc; expirationDate: Day.Day }>,
  'ProductExpiration'
>

const _Expiration = Brand.nominal<Expiration>()

/**
 * What is stored of a product: its persistent fields, never the derived ones
 * (expiration status, freshness, …). Only `toSnapshot` can make one, so a
 * snapshot always comes from a valid product.
 */
export type Snapshot = Brand.Branded<
  Readonly<{
    name: string
    creationDate: DateTime.Utc
    maybeExpirationDate: Opt.Option<Day.Day>
  }>,
  'ProductSnapshot'
>

const _Snapshot = Brand.nominal<Snapshot>()

export type UnvalidatedSnapshot = Readonly<{
  maybeName: Opt.Option<string>
  maybeCreationDate: Opt.Option<DateTime.Utc>
  maybeExpirationDate: Opt.Option<Day.Day>
}>

/** A product's name, from what the user typed: normalized, and never blank. */
const nameFrom = (text: string): Opt.Option<NormalizedString.NormalizedString> => NormalizedString.fromString(text)

// An expiration date is a day of the calendar (`docs/dates.md`). The product is good through that day. It has
// expired from the start of the next one, in the zone of the device.
const expiresAt = (expirationDate: Day.Day, zone: DateTime.TimeZone) =>
  Day.startIn(Day.addDays(expirationDate, 1), zone)

/** Whether a product created at `creationDate` may expire on `expirationDate`: not before its creation's day there. */
export const canExpireOn = (creationDate: DateTime.Zoned) => (expirationDate: Day.Day): boolean =>
  Order.isGreaterThanOrEqualTo(Day.Order)(expirationDate, Day.fromDateTime(creationDate))

/**
 * A new product, from what the user entered, created at `creationDate` in the zone the expiration was named in;
 * `None` when it breaks a rule of a product.
 */
export const make = (
  input: Readonly<{
    name: string
    creationDate: DateTime.Zoned
    maybeExpirationDate: Opt.Option<Day.Day>
  }>,
): Opt.Option<Product> =>
  Opt.gen(function*() {
    const name = yield* nameFrom(input.name)
    if (Opt.exists(input.maybeExpirationDate, (date) => !canExpireOn(input.creationDate)(date))) {
      return yield* Opt.none()
    }
    const creationDate = DateTime.toUtc(input.creationDate)
    return _Product({ name, creationDate, maybeExpirationDate: input.maybeExpirationDate })
  })

/**
 * Whether `product`, edited in `zone`, may expire on `expirationDate`: not before its creation's day there, nor
 * before the day it expires on already, which may have been set in a zone further west.
 */
export const canBeEditedToExpireOn = (product: Product, zone: DateTime.TimeZone) => (expirationDate: Day.Day) =>
  canExpireOn(DateTime.setZone(product.creationDate, zone))(expirationDate)
  || Opt.exists(product.maybeExpirationDate, (date) => Order.isGreaterThanOrEqualTo(Day.Order)(expirationDate, date))

/** `product` with the name and the expiration edited in `zone`; `None` when they break a rule of a product. */
export const edit = (
  product: Product,
  input: Readonly<{ name: string; maybeExpirationDate: Opt.Option<Day.Day> }>,
  zone: DateTime.TimeZone,
): Opt.Option<Product> =>
  Opt.gen(function*() {
    const name = yield* nameFrom(input.name)
    if (Opt.exists(input.maybeExpirationDate, (date) => !canBeEditedToExpireOn(product, zone)(date))) {
      return yield* Opt.none()
    }
    return _Product({ name, creationDate: product.creationDate, maybeExpirationDate: input.maybeExpirationDate })
  })

/**
 * A stored product, as a storage gives it back. More forgiving than `make`: a name that is no longer valid
 * is replaced, so that the product can still be shown and deleted. The expiration is not checked against the
 * creation: the creation's day depends on the zone the product was created in.
 */
export const fromSnapshot = (p: UnvalidatedSnapshot): Opt.Option<Product> =>
  Opt.gen(function*() {
    const [name, creationDate] = yield* Opt.all([
      Opt.gen(function*() {
        const maybeName = NormalizedString.fromString(yield* p.maybeName)
        if (Opt.isNone(maybeName)) {
          return yield* NormalizedString.fromString('Undefined name')
        }
        return maybeName.value
      }),
      p.maybeCreationDate,
    ])
    return _Product({ creationDate, maybeExpirationDate: p.maybeExpirationDate, name })
  })

export const toSnapshot = ({ name, creationDate, maybeExpirationDate }: Product): Snapshot =>
  _Snapshot({ name, creationDate, maybeExpirationDate })

export const maybeExpiration = ({ creationDate, maybeExpirationDate }: Product): Opt.Option<Expiration> =>
  Opt.map(maybeExpirationDate, (expirationDate) => _Expiration({ creationDate, expirationDate }))

const freshness = (currentDate: DateTime.DateTime, creationDate: DateTime.Utc, end: DateTime.DateTime) => {
  if (DateTime.isLessThan(currentDate, creationDate)) {
    return UnitInterval.makeUnsafe(1)
  }
  const remainingDuration = DateTime.distance(currentDate, end)
  const totalDuration = DateTime.distance(creationDate, end)
  return UnitInterval.makeUnsafe(Duration.toMillis(remainingDuration) / Duration.toMillis(totalDuration))
}

// The days ahead within which a product is to be eaten soon: a few days of a weekly shopping (`docs/freshness.md`).
export const SOON_DAYS = 3

/**
 * Whether a product has expired at `currentDate`, and since how many days (1 the day after its expiration day),
 * or how much of its life is left and in how many days it expires (0 on the expiration day, 1 the day before):
 * the calendar's counts, which change at midnight only, as the user counts from the date on the package. The
 * days are those of the zone of `currentDate`.
 */
export const expirationStatus = (currentDate: DateTime.Zoned) => ({ creationDate, expirationDate }: Expiration) => {
  const today = Day.fromDateTime(currentDate)
  if (Order.isLessThan(Day.Order)(expirationDate, today)) {
    return { hasExpired: true, daysSinceExpiration: Day.daysBetween(expirationDate, today) } as const
  }
  return {
    // Now is before the end, and past the creation when freshness divides: the total duration is never zero.
    freshness: freshness(currentDate, creationDate, expiresAt(expirationDate, currentDate.zone)),
    hasExpired: false,
    daysUntilExpiration: Day.daysBetween(today, expirationDate),
  } as const
}
