import {
	differenceInDays,
	differenceInHours,
} from 'date-fns'

export const formatRemainingTime = (
	from: number,
	to: number,
): string => {
	const remaining = to - from

	if (remaining < -1) {
		const hours = differenceInHours(to, from)
		return `${hours.toString(10)}h`
	}

	const hours = differenceInHours(to, from)

	if (hours < 1) {
		return '1h'
	}

	const days = differenceInDays(to, from)

	if (days < 1) {
		return `${hours.toString(10)}h`
	}

	if (days <= 28) {
		return `${days.toString(10)}d`
	}

	return `>4w`
}
