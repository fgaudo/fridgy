import {
	type Component,
	createMemo,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

export const TopBar: Component<{
	isSelectModeEnabled: boolean
	itemsSelected: number
	onMenuClick: () => void
	onDeleteClick: () => void
	onCloseSelectMode: () => void
}> = props => {
	const size = createMemo<number>(prev => {
		return props.isSelectModeEnabled
			? props.itemsSelected
			: (prev ?? 0)
	})
	return (
		<Portal>
			<SmallTopAppBar>
				<div class="relative h-full w-full">
					<div
						class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all duration-300"
						classList={{
							'opacity-0 pointer-events-none':
								props.isSelectModeEnabled,
						}}>
						<md-icon-button
							class="ml-[-8px] shrink-0"
							onClick={() => {
								props.onMenuClick()
							}}>
							<md-icon>menu</md-icon>
						</md-icon-button>
						<div class="font-titleLarge text-titleLarge leading-titleLarge">
							Home
						</div>
					</div>
					<div
						class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all duration-300"
						classList={{
							'opacity-0 pointer-events-none':
								!props.isSelectModeEnabled,
						}}>
						<md-icon-button
							class="ml-[-8px] shrink-0"
							onClick={() => {
								props.onCloseSelectMode()
							}}>
							<md-icon>close</md-icon>
						</md-icon-button>

						{size()}

						<md-icon-button
							class="ml-auto mr-[-8px] shrink-0"
							onClick={() => {
								props.onDeleteClick()
							}}>
							<md-icon>delete</md-icon>
						</md-icon-button>
					</div>
				</div>
			</SmallTopAppBar>
		</Portal>
	)
}
