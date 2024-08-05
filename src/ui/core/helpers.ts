import {
	differenceInDays,
	differenceInHours,
} from 'date-fns'
import { function as F } from 'fp-ts'
import * as Rx from 'rxjs'
import {
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'

import { TOAST_DELAY_MS } from './constants'

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

export function handleShowToast<STATE>({
	hide,
	show,
}: {
	hide: () => STATE
	show: (message: string) => STATE
}) {
	return F.flow(
		(message: string) =>
			Rx.scheduled(
				Rx.of(message),
				Rx.asyncScheduler,
			),
		Rx.delay(100),
		Rx.mergeMap(message =>
			F.pipe(
				Rx.scheduled(
					Rx.of(message),
					Rx.asyncScheduler,
				),
				Rx.map(() => ({
					mutation: hide(),
				})),
				Rx.delay(TOAST_DELAY_MS),
				Rx.startWith({
					mutation: show(message),
				}),
			),
		),
		Rx.startWith({
			mutation: hide(),
		}),
	)
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

	if (days <= 31) {
		return `${days.toString(10)}d`
	}

	return `>1m`
}
