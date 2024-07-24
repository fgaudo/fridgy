import type {
	Component,
	JSXElement,
} from 'solid-js'

import { useWindowScrollTop } from '@/ui/core/helpers'

export const SmallTopAppBar: Component<{
	children: JSXElement
}> = props => {
	const isScrolledTop = useWindowScrollTop()
	return (
		<div
			class="fixed left-0 right-0 top-0 z-40 h-[64px] transition-colors duration-1000 ease-in-out"
			classList={{
				'delay-0 bg-surface text-onSurface':
					isScrolledTop(),
				'delay-100 bg-surface-container text-onSurface-container':
					!isScrolledTop(),
			}}
			style={{
				'--md-elevation-level': isScrolledTop()
					? 'var(--md-sys-elevation-level0)'
					: 'var(--md-sys-elevation-level2)',
			}}>
			{props.children}
			<md-elevation />
		</div>
	)
}
