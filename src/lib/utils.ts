export const formatRemainingTime = (ms: number): string => {
	const days = ms / (1000 * 60 * 60 * 24)

	if (days < 1) {
		return `< 1d`
	}

	if (days <= 28) {
		return `${days.toString(10)}d`
	}

	return `>4w`
}
