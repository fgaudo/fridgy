import { differenceInDays } from 'date-fns'

export const formatRemainingTime = (
	from: number,
	to: number,
): string => {
	if (to - from <= 0) {
		return 'EXP'
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
