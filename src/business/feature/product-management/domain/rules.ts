import * as Integer from '@/core/integer/index.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

export const isProductStale = ({
	expirationDate,
	currentDate,
}: {
	expirationDate: Integer.Integer
	currentDate: Integer.Integer
}) => expirationDate <= currentDate

export const computeTimeLeft = ({
	expirationDate,
	currentDate,
}: {
	expirationDate: Integer.Integer
	currentDate: Integer.Integer
}) =>
	Integer.unsafeFromNumber(
		expirationDate > currentDate ? expirationDate - currentDate : 0,
	)

export const computeFreshness = ({
	creationDate,
	expirationDate,
	currentDate,
}: {
	creationDate: Integer.Integer
	expirationDate: Integer.Integer
	currentDate: Integer.Integer
}): UnitInterval.UnitInterval => {
	if (expirationDate <= currentDate) {
		return UnitInterval.unsafeFromNumber(0)
	}

	const totalDuration = expirationDate - creationDate

	if (totalDuration <= 0) {
		return UnitInterval.unsafeFromNumber(0)
	}

	const remainingDuration = expirationDate - currentDate

	if (remainingDuration > totalDuration) {
		return UnitInterval.unsafeFromNumber(1)
	}

	return UnitInterval.unsafeFromNumber(remainingDuration / totalDuration)
}
