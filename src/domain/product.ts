import * as Newtype from 'effect/Newtype'
import * as Opt from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as NormalizedString from '@/core/normalized-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

type Product = Newtype.Newtype<
	'Product',
	{
		name: NormalizedString.NormalizedString
		creationDate: Integer.Integer
		maybeExpirationDate: Opt.Option<Integer.Integer>
	}
>

const productIso = Newtype.makeIso<Product>()

type Expiration = Newtype.Newtype<
	'Expiration',
	{ creationDate: Integer.Integer; expirationDate: Integer.Integer }
>

const expirationIso = Newtype.makeIso<Expiration>()

export type ProductInput = {
	maybeName: Opt.Option<string>
	maybeCreationDate: Opt.Option<Integer.Integer>
	maybeExpirationDate: Opt.Option<Integer.Integer>
}

export type ProductOutput = {
	name: string
	creationDate: Integer.Integer
	maybeExpirationDate: Opt.Option<Integer.Integer>
}

export const makeProduct = (p: ProductInput): Opt.Option<Product> =>
	Opt.gen(function* () {
		const [name, creationDate] = yield* Opt.all([
			Opt.gen(function* () {
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
				name,
				creationDate,
				maybeExpirationDate: Opt.none(),
			})
		}
		if (creationDate > p.maybeExpirationDate.value) {
			return yield* Opt.none()
		}
		return productIso.set({
			name,
			creationDate,
			maybeExpirationDate: p.maybeExpirationDate,
		})
	})

export const toOutput = (p: Product): ProductOutput => productIso.get(p)

export const maybeExpiration = (product: Product) =>
	Opt.gen(function* () {
		const p = productIso.get(product)
		const expirationDate = yield* p.maybeExpirationDate
		return expirationIso.set({ creationDate: p.creationDate, expirationDate })
	})

export const isValid = (p: ProductInput) => makeProduct(p).pipe(Opt.isSome)

export const name = (product: Product): string => productIso.get(product).name

export const creationDate = (product: Product) =>
	productIso.get(product).creationDate

export const expirationDate = (expiration: Expiration) =>
	expirationIso.get(expiration).expirationDate

const _freshness =
	(currentDate: Integer.Integer) => (expiration: Expiration) => {
		const exp = expirationIso.get(expiration)
		if (exp.expirationDate <= currentDate) {
			return UnitInterval.unsafeFromNumber(0)
		}
		if (exp.expirationDate <= exp.creationDate) {
			return UnitInterval.unsafeFromNumber(0)
		}
		if (currentDate < exp.creationDate) {
			return UnitInterval.unsafeFromNumber(1)
		}
		const remainingDuration = exp.expirationDate - currentDate
		const totalDuration = exp.expirationDate - exp.creationDate
		return UnitInterval.unsafeFromNumber(remainingDuration / totalDuration)
	}

const _timeLeft =
	(currentDate: Integer.Integer) => (expiration: Expiration) => {
		const exp = expirationIso.get(expiration)
		const timeLeft = exp.expirationDate - currentDate
		return timeLeft <= 0
			? Integer.fromNumberUnsafe(0)
			: Integer.fromNumberUnsafe(timeLeft)
	}

export const expirationStatus =
	(currentDate: Integer.Integer) => (expiration: Expiration) => {
		const exp = expirationIso.get(expiration)
		if (currentDate >= exp.expirationDate) {
			return { hasExpired: true } as const
		}
		return {
			timeLeft: _timeLeft(currentDate)(expiration),
			freshness: _freshness(currentDate)(expiration),
			hasExpired: false,
		} as const
	}
