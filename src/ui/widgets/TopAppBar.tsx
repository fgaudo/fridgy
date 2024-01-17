import {
	Component,
	JSXElement,
	createSignal,
	onCleanup,
} from 'solid-js'

import { joinClasses } from '@/ui/core/utils'

export const TopAppBar: Component<{
	children: JSXElement
}> = props => {
	const [isScrolledTop, setScrolledTop] =
		createSignal(true)

	const callback = () => {
		if (isScrolledTop() && window.scrollY !== 0) {
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

	return (
		<div
			class="fixed left-0 right-0 top-0 z-50 box-content flex h-[56px] items-center transition-colors duration-500 ease-in-out"
			classList={{
				[joinClasses([
					'delay-0',
					'bg-[var(--md-sys-color-surface)]',
					'text-[var(--md-sys-color-on-surface)]',
				])]: isScrolledTop(),
				[joinClasses([
					'delay-100',
					'bg-[var(--md-sys-color-surface-variant)]',
					'text-[var(--md-sys-color-on-surface-variant)]',
				])]: !isScrolledTop(),
			}}>
			{props.children}
			<md-elevation />
		</div>
	)
}
