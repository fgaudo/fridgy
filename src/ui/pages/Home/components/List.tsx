import { format } from 'date-fns'
import { option as OPT } from 'fp-ts'
import {
	type Component,
	For,
	Show,
	createMemo,
	createRenderEffect,
} from 'solid-js'

import { formatRemainingTime } from '@/ui/core/helpers'

import { useUiStateContext } from '../context'
import { ExpirationBar } from './ExpirationBar'

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
									left: '0',
									right: '0',
								}}>
								<md-list-item
									prop:type="button"
									style={{
										'content-visibility': 'auto',
									}}
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
									<Show
										fallback={
											<div slot="supporting-text" />
										}
										when={
											OPT.isSome(
												model.expirationDate,
											) &&
											model.expirationDate.value
										}>
										{expiration => (
											<>
												<div
													slot="end"
													class="relative flex h-[24px] w-[24px] items-center justify-center text-sm transition-all duration-fade">
													<md-icon
														classList={{
															'opacity-0':
																state.selectedProducts.has(
																	model.id,
																) ||
																!uiState.isSelectModeEnabled,
														}}
														class="absolute text-primary transition-all duration-fade">
														check_box_outline_blank
													</md-icon>
													<md-icon
														classList={{
															'opacity-0':
																!state.selectedProducts.has(
																	model.id,
																) ||
																!uiState.isSelectModeEnabled,
														}}
														style={{
															'font-variation-settings':
																"'FILL' 1",
														}}
														class="absolute text-primary transition-all duration-fade">
														check_box
													</md-icon>
													<div
														class="absolute text-xs text-primary transition-all duration-fade"
														classList={{
															'opacity-0':
																uiState.isSelectModeEnabled,
														}}>
														{formatRemainingTime(
															uiState.currentTimestamp,
															expiration(),
														)}
													</div>
												</div>
												<div
													slot="start"
													class="flex flex-col items-center">
													<div class="text-sm">
														{format(
															expiration(),
															'd',
														)}
													</div>
													<div class="text-sm">
														{format(
															expiration(),
															'LLL',
														)}
													</div>
												</div>

												<div slot="supporting-text">
													<ExpirationBar
														id={model.id}
													/>
												</div>
											</>
										)}
									</Show>
									<div
										slot="headline"
										class="text-ellipsis whitespace-nowrap capitalize">
										{model.name}
									</div>
								</md-list-item>
							</div>
						)
					}}
				</For>
			</md-list>
		</div>
	)
}
