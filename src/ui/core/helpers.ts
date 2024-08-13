import {
	differenceInDays,
	differenceInHours,
} from 'date-fns'
import {
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'

export const useWindowScrollTop = () => {
	const [isScrolledTop, setScrolledTop] =
		createSignal(true)

	const callback = () => {
		const top = isScrolledTop()
		const scrollY = window.scrollY
		if (top && scrollY !== 0) {
			setScrolledTop(false)
		} else if (!top && scrollY === 0) {
			setScrolledTop(true)
		}
	}

	document.addEventListener('scroll', callback)

	onCleanup(() => {
		document.removeEventListener(
			'scroll',
			callback,
		)
	})

	return isScrolledTop
}

export const useWindowScroll = () => {
	const [scrollValues, setScroll] = createSignal<{
		isScrolling: boolean
		scrollY: number
	}>({
		isScrolling: false,
		scrollY: window.scrollY,
	})

	const start = () => {
		setScroll({
			isScrolling: true,
			scrollY: window.scrollY,
		} as const)
	}

	const end = () => {
		setScroll({
			isScrolling: false,
			scrollY: window.scrollY,
		} as const)
	}

	createEffect(() => {
		window.addEventListener('scroll', start)
		window.addEventListener('scrollend', end)

		onCleanup(() => {
			window.removeEventListener('scroll', start)
			window.removeEventListener('scrollend', end)
		})
	})

	return scrollValues
}

export const formatRemainingTime = (
	from: number,
	to: number,
): string => {
	const remaining = to - from

	if (remaining < 0) {
		return 'EXP'
	}

	const days = differenceInDays(to, from)

	if (days === 0) {
		return `${differenceInHours(to, from).toString(10)}h`
	}

	if (days <= 28) {
		return `${days.toString(10)}d`
	}

	return `>4w`
}
