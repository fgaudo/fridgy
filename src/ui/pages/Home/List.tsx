import {
	type Component,
	For,
	createRenderEffect,
} from 'solid-js'

import type { ProductModel } from '@/app/use-cases/product-list'

export const List: Component<{
	products: ProductModel[]
	totalItems: number
	isItemSelected: (id: string) => boolean
	isSelectModeEnabled: boolean
	logItemRender: (message: string) => void
	onItemClick: (id: string) => void
	onItemContextMenu: (id: string) => void
}> = props => {
	return (
		<div class="pb-[128px] pt-[64px]">
			<p class="px-[14px] pt-[10px] text-xs">
				{props.totalItems} items
			</p>
			<md-list>
				<For each={props.products}>
					{(model, i) => {
						createRenderEffect(() => {
							props.logItemRender(
								`Rendered item ${model.name} on position ${i().toString(10)}`,
							)
						})
						return (
							<div
								class="absolute transition-all duration-300"
								style={{
									top: `${(i() * 73 + 9).toString(10)}px`,
									left: 0,
									right: 0,
								}}>
								<md-list-item
									prop:type="button"
									classList={{
										'bg-surface-variant':
											props.isItemSelected(
												model.id,
											),
									}}
									onClick={e => {
										e.preventDefault()

										props.onItemClick(model.id)
									}}
									onContextMenu={e => {
										e.preventDefault()

										props.onItemContextMenu(
											model.id,
										)
									}}>
									<md-icon slot="start">
										ac_unit
									</md-icon>

									<div
										classList={{
											'opacity-0':
												!props.isSelectModeEnabled,
										}}
										slot="end"
										class="relative flex h-[24px] w-[24px] items-center justify-center transition-all duration-300">
										<md-icon
											classList={{
												'opacity-0':
													props.isItemSelected(
														model.id,
													),
											}}
											class="absolute text-primary transition-all duration-300">
											check_box_outline_blank
										</md-icon>
										<md-icon
											classList={{
												'opacity-0':
													!props.isItemSelected(
														model.id,
													),
											}}
											style={{
												'font-variation-settings':
													"'FILL' 1",
											}}
											class="absolute text-primary transition-all duration-300">
											check_box
										</md-icon>
									</div>

									<div
										slot="headline"
										class="capitalize">
										{model.name}
									</div>
									<div slot="supporting-text">
										<div />
									</div>
								</md-list-item>
								<md-divider />
							</div>
						)
					}}
				</For>
			</md-list>
		</div>
	)
}
