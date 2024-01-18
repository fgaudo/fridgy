import {
	createEffect,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js'

export const createWindowScrolledTopListener =
	() => {
		const [isScrolledTop, setScrolledTop] =
			createSignal(true)

		const callback = () => {
			if (
				isScrolledTop() &&
				window.scrollY !== 0
			) {
				setScrolledTop(false)
			} else if (
				!isScrolledTop() &&
				window.scrollY === 0
			) {
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
			createSignal<
				Readonly<{
					isScrolling: boolean
					scrollY: number
				}>
			>({
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

export const delayed = () => {
	const [isMounted, setMounted] =
		createSignal(false)
	console.log(isMounted())
	onMount(() => {
		console.log(isMounted())

		setTimeout(() => {
			setMounted(true)
		})
	})

	return isMounted
}
