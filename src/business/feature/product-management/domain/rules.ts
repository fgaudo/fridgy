import * as Integer from '@/core/integer/integer.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

export const isProductStale = ({
	expirationDate,
	currentDate,
}: {
	expirationDate: Integer.Integer
	currentDate: Integer.Integer
}) => expirationDate <= currentDate

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

	if (expirationDate <= creationDate) {
		return UnitInterval.unsafeFromNumber(0)
	}

	if (currentDate < creationDate) {
		return UnitInterval.unsafeFromNumber(1)
	}

	const remainingDuration = expirationDate - currentDate
	const totalDuration = expirationDate - creationDate

	return UnitInterval.unsafeFromNumber(remainingDuration / totalDuration)
}
