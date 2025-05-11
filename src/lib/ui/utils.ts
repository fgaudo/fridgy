import {
	differenceInDays,
	differenceInHours,
} from 'date-fns'

export const formatRemainingTime = (
	from: number,
	to: number,
): string => {
	const hours = differenceInHours(to, from)

	if (hours <= -24) {
		const days = differenceInDays(to, from)
		return `${days.toString(10)}d`
	}

	if (hours < 0) {
		return `${hours.toString(10)}h`
	}

	const days = differenceInDays(to, from)

	if (days < 1) {
		return `< 1d`
	}

	if (days <= 28) {
		return `${days.toString(10)}d`
	}

	return `>4w`
}
