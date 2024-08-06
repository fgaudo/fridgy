import type { Component } from 'solid-js'

import { useFridgyNavigate } from '@/ui/router'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

export const TopBar: Component = () => {
	const navigate = useFridgyNavigate()

	return (
		<SmallTopAppBar>
			<div class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all">
				<md-icon-button
					class="pl-[4px]"
					onClick={() => {
						navigate(-1)
					}}>
					<md-icon>arrow_back</md-icon>
				</md-icon-button>
				<div class="font-titleLarge text-titleLarge leading-titleLarge">
					Add a new product
				</div>
			</div>
		</SmallTopAppBar>
	)
}
