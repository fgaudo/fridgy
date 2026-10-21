import * as Brand from 'effect/Brand'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Newtype from 'effect/Newtype'
import * as Opt from 'effect/Option'
import * as UnitInterval from '#libs/numbers/unit-interval.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'

export type Product = Newtype.Newtype<
  'Product',
  {
    name: NormalizedString.NormalizedString
    creationDate: DateTime.Utc
    maybeExpirationDate: Opt.Option<DateTime.Utc>
  }
>

const productIso = Newtype.makeIso<Product>()

type Expiration = Newtype.Newtype<
  'Expiration',
  { creationDate: DateTime.Utc; expirationDate: DateTime.Utc }
>

const expirationIso = Newtype.makeIso<Expiration>()

/**
 * What is stored of a product: its persistent fields, never the derived ones
 * (expiration status, freshness, …). Only `toSnapshot` can make one, so a
 * snapshot always comes from a valid product.
 */
export type Snapshot = Brand.Branded<
  Readonly<{
    name: string
    creationDate: DateTime.Utc
    maybeExpirationDate: Opt.Option<DateTime.Utc>
  }>,
  'ProductSnapshot'
>

const _Snapshot = Brand.nominal<Snapshot>()

export type UnvalidatedSnapshot = Readonly<{
  maybeName: Opt.Option<string>
  maybeCreationDate: Opt.Option<DateTime.Utc>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}>

/** A product's name, from what the user typed: normalized, and never blank. */
const nameFrom = (text: string): Opt.Option<NormalizedString.NormalizedString> => NormalizedString.fromString(text)

// An expiration date names a day: the product is good through that day, and has
// expired from the start of the next one.
const expiresAt = (expirationDate: DateTime.Utc) => DateTime.add(DateTime.startOf(expirationDate, 'day'), { days: 1 })

/** Whether a product created at `creationDate` may expire on the day of `expirationDate`: not on a day before. */
export const canExpireOn = (creationDate: DateTime.Utc) => (expirationDate: DateTime.Utc) =>
  DateTime.isLessThan(creationDate, expiresAt(expirationDate))

const mayExpireOn = (creationDate: DateTime.Utc, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.isNone(maybeExpirationDate) || canExpireOn(creationDate)(maybeExpirationDate.value)

/** A new product, from what the user entered; `None` when it breaks a rule of a product. */
export const make = (
  input: Readonly<{
    name: string
    creationDate: DateTime.Utc
    maybeExpirationDate: Opt.Option<DateTime.Utc>
  }>,
): Opt.Option<Product> =>
  Opt.gen(function*() {
    const name = yield* nameFrom(input.name)
    if (!mayExpireOn(input.creationDate, input.maybeExpirationDate)) {
      return yield* Opt.none()
    }
    return productIso.set({ name, creationDate: input.creationDate, maybeExpirationDate: input.maybeExpirationDate })
  })

/**
 * A stored product, as a storage gives it back. More forgiving than `make`: a name that is no longer valid
 * is replaced, so that the product can still be shown and deleted.
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
    if (!mayExpireOn(creationDate, p.maybeExpirationDate)) {
      return yield* Opt.none()
    }
    return productIso.set({ creationDate, maybeExpirationDate: p.maybeExpirationDate, name })
  })

export const toSnapshot = (product: Product): Snapshot => _Snapshot({ ...productIso.get(product) })

export const maybeExpiration = (product: Product) =>
  Opt.gen(function*() {
    const p = productIso.get(product)
    const expirationDate = yield* p.maybeExpirationDate
    return expirationIso.set({ creationDate: p.creationDate, expirationDate })
  })

export const name = (product: Product): string => productIso.get(product).name

export const expirationDate = (expiration: Expiration) => expirationIso.get(expiration).expirationDate

const freshness = (currentDate: DateTime.Utc, creationDate: DateTime.Utc, end: DateTime.Utc) => {
  if (DateTime.isLessThan(currentDate, creationDate)) {
    return UnitInterval.makeUnsafe(1)
  }
  const remainingDuration = DateTime.distance(currentDate, end)
  const totalDuration = DateTime.distance(creationDate, end)
  return UnitInterval.makeUnsafe(Duration.toMillis(remainingDuration) / Duration.toMillis(totalDuration))
}

export const expirationStatus = (currentDate: DateTime.Utc) => (expiration: Expiration) => {
  const { creationDate, expirationDate } = expirationIso.get(expiration)
  const end = expiresAt(expirationDate)
  if (DateTime.isGreaterThanOrEqualTo(currentDate, end)) {
    return { hasExpired: true } as const
  }
  return {
    // A product ends after it is created (see `canExpireOn`), so the total duration is never zero.
    freshness: freshness(currentDate, creationDate, end),
    hasExpired: false,
    timeLeft: DateTime.distance(currentDate, end),
  } as const
}
