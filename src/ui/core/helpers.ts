import * as Rx from 'rxjs'
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

export const createSubject = <CMD>(): [
	Rx.Observable<CMD>,
	(cmd: CMD) => void,
] => {
	const subject = new Rx.Subject<CMD>()

	onCleanup(() => {
		subject.unsubscribe()
	})

	return [
		subject,
		(cmd: CMD) => {
			if (!subject.closed) subject.next(cmd)
		},
	]
}
