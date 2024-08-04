import {
	type Component,
	For,
	createMemo,
	createRenderEffect,
} from 'solid-js'

import { useUiStateContext } from '../context'

export const List: Component = () => {
	const {
		store: [state, dispatch],
		uiStore: [uiState],
	} = useUiStateContext()!

	const totalItems = createMemo<number>(prev => {
		return state.total > 0
			? state.total
			: (prev ?? 0)
	})

	return (
		<div
			class="pb-[128px] pt-[64px] transition-all duration-fade"
			classList={{
				'opacity-0 pointer-events-none':
					state.total <= 0,
			}}>
			<p class="px-[14px] pt-[10px] text-xs">
				{totalItems()} items
			</p>
			<md-list>
				<For each={state.products}>
					{(model, i) => {
						createRenderEffect(() => {
							dispatch({
								type: 'log',
								severity: 'debug',
								message: `Rendered item ${model.name} on position ${i().toString(10)}`,
							})
						})
						return (
							<div
								class="absolute transition-all duration-fade"
								style={{
									top: `${(i() * 73 + 9).toString(10)}px`,
									left: 0,
									right: 0,
								}}>
								<md-list-item
									prop:type="button"
									classList={{
										'bg-surface-variant':
											state.selectedProducts.has(
												model.id,
											),
									}}
									onClick={e => {
										e.preventDefault()

										if (
											uiState.isSelectModeEnabled
										) {
											dispatch({
												type: 'toggleItem',
												id: model.id,
											})
										}
									}}
									onContextMenu={e => {
										e.preventDefault()

										if (
											!uiState.isSelectModeEnabled
										) {
											dispatch({
												type: 'toggleItem',
												id: model.id,
											})
										}
									}}>
									<md-icon slot="start">
										ac_unit
									</md-icon>

									<div
										classList={{
											'opacity-0':
												!uiState.isSelectModeEnabled,
										}}
										slot="end"
										class="relative flex h-[24px] w-[24px] items-center justify-center transition-all duration-fade">
										<md-icon
											classList={{
												'opacity-0':
													state.selectedProducts.has(
														model.id,
													),
											}}
											class="absolute text-primary transition-all duration-fade">
											check_box_outline_blank
										</md-icon>
										<md-icon
											classList={{
												'opacity-0':
													!state.selectedProducts.has(
														model.id,
													),
											}}
											style={{
												'font-variation-settings':
													"'FILL' 1",
											}}
											class="absolute text-primary transition-all duration-fade">
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
