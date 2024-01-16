import {
	Component,
	JSXElement,
	createSignal,
} from 'solid-js'

export const TopAppBar: Component<{
	children: JSXElement
}> = props => {
	const [isScrolledTop, setScrolledTop] =
		createSignal(true)

	document.addEventListener('scroll', () => {
		if (isScrolledTop() && window.scrollY !== 0) {
			setScrolledTop(false)
		} else if (
			!isScrolledTop() &&
			window.scrollY === 0
		) {
			setScrolledTop(true)
		}
	})

	return (
		<div
			class="fixed left-0 right-0 top-0 z-50 box-content flex h-[56px] items-center transition-colors duration-300 ease-out"
			style={{
				'background-color': isScrolledTop()
					? 'var(--md-sys-color-surface)'
					: 'var(--md-sys-color-surface-variant)',
				color: isScrolledTop()
					? 'var(--md-sys-color-on-surface)'
					: 'var(--md-sys-color-on-surface-variant)',
			}}>
			{props.children}
			<md-elevation />
		</div>
	)
}
