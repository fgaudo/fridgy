import * as Brand from 'effect/Brand'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Newtype from 'effect/Newtype'
import * as Opt from 'effect/Option'
import * as NormalizedString from '@/libs/strings/normalized-string.ts'
import * as UnitInterval from '@/libs/numbers/unit-interval.ts'

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

/** A snapshot as read back from storage, which may be incomplete or corrupt. */
export type UnvalidatedSnapshot = Readonly<{
  maybeName: Opt.Option<string>
  maybeCreationDate: Opt.Option<DateTime.Utc>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}>

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
    if (Opt.isNone(p.maybeExpirationDate)) {
      return productIso.set({
        creationDate,
        maybeExpirationDate: Opt.none(),
        name,
      })
    }
    if (DateTime.isLessThan(p.maybeExpirationDate.value, creationDate)) {
      return yield* Opt.none()
    }
    return productIso.set({
      creationDate,
      maybeExpirationDate: p.maybeExpirationDate,
      name,
    })
  })

export const toSnapshot = (product: Product): Snapshot => _Snapshot({ ...productIso.get(product) })

export const maybeExpiration = (product: Product) =>
  Opt.gen(function*() {
    const p = productIso.get(product)
    const expirationDate = yield* p.maybeExpirationDate
    return expirationIso.set({ creationDate: p.creationDate, expirationDate })
  })

export const name = (product: Product): string => productIso.get(product).name

export const creationDate = (product: Product) => productIso.get(product).creationDate

export const expirationDate = (expiration: Expiration) => expirationIso.get(expiration).expirationDate

const _freshness = (currentDate: DateTime.Utc) => (expiration: Expiration) => {
  const exp = expirationIso.get(expiration)
  if (DateTime.isLessThanOrEqualTo(exp.expirationDate, currentDate)) {
    return UnitInterval.unsafeFromNumber(0)
  }
  if (DateTime.isLessThanOrEqualTo(exp.expirationDate, exp.creationDate)) {
    return UnitInterval.unsafeFromNumber(0)
  }
  if (DateTime.isLessThan(currentDate, exp.creationDate)) {
    return UnitInterval.unsafeFromNumber(1)
  }
  const remainingDuration = DateTime.distance(currentDate, exp.expirationDate)
  const totalDuration = DateTime.distance(exp.creationDate, exp.expirationDate)
  return UnitInterval.unsafeFromNumber(Duration.toMillis(remainingDuration) / Duration.toMillis(totalDuration))
}

const _timeLeft = (currentDate: DateTime.Utc) => (expiration: Expiration) => {
  const exp = expirationIso.get(expiration)
  return DateTime.distance(currentDate, exp.expirationDate)
}

export const expirationStatus = (currentDate: DateTime.Utc) => (expiration: Expiration) => {
  const exp = expirationIso.get(expiration)
  if (currentDate >= exp.expirationDate) {
    return { hasExpired: true } as const
  }
  return {
    freshness: _freshness(currentDate)(expiration),
    hasExpired: false,
    timeLeft: _timeLeft(currentDate)(expiration),
  } as const
}
