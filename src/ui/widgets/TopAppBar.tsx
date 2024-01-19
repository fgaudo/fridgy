import type {
	Component,
	JSXElement,
} from 'solid-js'

import { createWindowScrolledTopListener } from '@/ui/core/helpers'
import { joinClasses } from '@/ui/core/utils'

export const TopAppBar: Component<{
	children: JSXElement
}> = props => {
	const isScrolledTop =
		createWindowScrolledTopListener()
	return (
		<div
			class="fixed left-0 right-0 top-0 z-40 box-content flex h-[56px] items-center gap-[24px] transition-colors duration-500 ease-in-out"
			classList={{
				[joinClasses([
					'delay-0',
					'bg-[var(--md-sys-color-surface)]',
					'text-[var(--md-sys-color-on-surface)]',
				])]: isScrolledTop(),
				[joinClasses([
					'delay-100',
					'bg-[var(--md-sys-color-surface-container)]',
					'text-[var(--md-sys-color-on-surface-container)]',
				])]: !isScrolledTop(),
			}}>
			{props.children}
			<md-elevation />
		</div>
	)
}
