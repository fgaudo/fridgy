import {
	type Component,
	For,
	createMemo,
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
	const totalItems = createMemo<number>(prev => {
		return props.totalItems > 0
			? props.totalItems
			: (prev ?? 0)
	})
	return (
		<div
			class="duration-fade pb-[128px] pt-[64px] transition-all"
			classList={{
				'opacity-0 pointer-events-none':
					props.totalItems <= 0,
			}}>
			<p class="px-[14px] pt-[10px] text-xs">
				{totalItems()} items
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
								class="duration-fade absolute transition-all"
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
										class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center transition-all">
										<md-icon
											classList={{
												'opacity-0':
													props.isItemSelected(
														model.id,
													),
											}}
											class="duration-fade absolute text-primary transition-all">
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
											class="duration-fade absolute text-primary transition-all">
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
