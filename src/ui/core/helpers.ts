/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
import { createSignal, onCleanup } from 'solid-js'

export const createWindowScrolledTopListener =
	() => {
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

export const createOnWindowScrollListener =
	() => {
		const [scrollValues, setScroll] =
			createSignal<{
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

		window.addEventListener('scroll', start)
		window.addEventListener('scrollend', end)

		onCleanup(() => {
			window.removeEventListener('scroll', start)
			window.removeEventListener('scrollend', end)
		})

		return scrollValues
	}
