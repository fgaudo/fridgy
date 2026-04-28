import * as Newtype from 'effect/Newtype'
import * as Opt from 'effect/Option'

import * as NormalizedString from '@/shared/normalized-string.ts'
import * as UnitInterval from '@/shared/unit-interval.ts'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'

type Product = Newtype.Newtype<
  'Product',
  {
    name: NormalizedString.NormalizedString
    creationDate: DateTime.Zoned
    maybeExpirationDate: Opt.Option<DateTime.Zoned>
  }
>

const productIso = Newtype.makeIso<Product>()

type Expiration = Newtype.Newtype<
  'Expiration',
  { creationDate: DateTime.Zoned; expirationDate: DateTime.Zoned }
>

const expirationIso = Newtype.makeIso<Expiration>()

export type ProductInput = {
  maybeName: Opt.Option<string>
  maybeCreationDate: Opt.Option<DateTime.Zoned>
  maybeExpirationDate: Opt.Option<DateTime.Zoned>
}

export type ProductOutput = {
  name: string
  creationDate: DateTime.Zoned
  maybeExpirationDate: Opt.Option<DateTime.Zoned>
}

export const makeProduct = (p: ProductInput): Opt.Option<Product> =>
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

export const toOutput = (p: Product): ProductOutput => productIso.get(p)

export const maybeExpiration = (product: Product) =>
  Opt.gen(function*() {
    const p = productIso.get(product)
    const expirationDate = yield* p.maybeExpirationDate
    return expirationIso.set({ creationDate: p.creationDate, expirationDate })
  })

export const isValid = (p: ProductInput) => makeProduct(p).pipe(Opt.isSome)

export const name = (product: Product): string => productIso.get(product).name

export const creationDate = (product: Product) => productIso.get(product).creationDate

export const expirationDate = (expiration: Expiration) => expirationIso.get(expiration).expirationDate

const _freshness = (currentDate: DateTime.Zoned) => (expiration: Expiration) => {
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
  const remainingDuration = DateTime.distance(exp.expirationDate, currentDate)
  const totalDuration = DateTime.distance(exp.expirationDate, exp.creationDate)
  return UnitInterval.unsafeFromNumber(Duration.toMillis(remainingDuration) / Duration.toMillis(totalDuration))
}

const _timeLeft = (currentDate: DateTime.Zoned) => (expiration: Expiration) => {
  const exp = expirationIso.get(expiration)
  return DateTime.distance(exp.expirationDate, currentDate)
}

export const expirationStatus = (currentDate: DateTime.Zoned) => (expiration: Expiration) => {
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
