import { A } from '@solidjs/router'
import type { Component } from 'solid-js'

import { ROUTES } from '@/ui/router'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

export const TopBar: Component = () => {
	return (
		<SmallTopAppBar>
			<div class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all">
				<A href={ROUTES.home}>
					<md-icon-button class="pl-[4px]">
						<md-icon>arrow_back</md-icon>
					</md-icon-button>
				</A>
				<div class="font-titleLarge text-titleLarge leading-titleLarge">
					Add a new product
				</div>
			</div>
		</SmallTopAppBar>
	)
}
