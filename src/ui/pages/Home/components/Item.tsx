import { format } from 'date-fns'
import { type Component, Show } from 'solid-js'

import { HS, O } from '@/core/imports'

import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { formatRemainingTime } from '@/ui/core/helpers'

import { useUiStateContext } from '../context'
import { Message } from '../store/actions'
import { ExpirationBar } from './ExpirationBar'

export const Item: Component<{
	model: ProductModel
	index: () => number
}> = props => {
	const {
		store: [state, dispatch],
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<Show
			when={props.model.isValid && props.model}
			fallback={<div>asd</div>}>
			{model => (
				<div
					class="absolute transition-all duration-fade"
					style={{
						top: `${(props.index() * 72).toString(10)}px`,
						left: '0',
						right: '0',
					}}>
					<md-list-item
						prop:type="button"
						style={{
							'content-visibility': 'auto',
						}}
						classList={{
							'bg-surface-variant': HS.has(
								model().id,
							)(state.selectedProducts),
						}}
						onClick={e => {
							e.preventDefault()

							if (uiState.isSelectModeEnabled) {
								dispatch(
									Message.ToggleItem({
										id: model().id,
									}),
								)
							}
						}}
						onContextMenu={e => {
							e.preventDefault()

							if (!uiState.isSelectModeEnabled) {
								dispatch(
									Message.ToggleItem({
										id: model().id,
									}),
								)
							}
						}}>
						<div
							slot="end"
							class="relative flex h-[24px] w-[24px] items-center justify-center text-sm transition-all duration-fade">
							<md-icon
								classList={{
									'opacity-0':
										HS.has(model().id)(
											state.selectedProducts,
										) ||
										!uiState.isSelectModeEnabled,
								}}
								class="absolute text-primary transition-all duration-fade">
								check_box_outline_blank
							</md-icon>
							<md-icon
								classList={{
									'opacity-0':
										!HS.has(model().id)(
											state.selectedProducts,
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
							<Show
								when={(() => {
									const exp =
										model().expirationDate
									return (
										O.isSome(exp) &&
										exp.value >
											uiState.currentTimestamp &&
										exp.value
									)
								})()}>
								{expiration => (
									<div
										class="absolute text-xs text-primary transition-all duration-fade"
										classList={{
											'opacity-0':
												uiState.isSelectModeEnabled,
											'text-red-500 font-bold':
												expiration() <
												uiState.currentTimestamp -
													0,
										}}>
										{formatRemainingTime(
											uiState.currentTimestamp,
											expiration(),
										)}
									</div>
								)}
							</Show>
						</div>

						<div slot="supporting-text">
							<Show
								when={(() => {
									const exp =
										model().expirationDate
									return (
										O.isSome(exp) && exp.value
									)
								})()}>
								{expiration => (
									<ExpirationBar
										expiration={expiration}
										creation={
											model().creationDate
										}
									/>
								)}
							</Show>
						</div>

						<div
							slot="start"
							class="flex flex-col items-center">
							<Show
								fallback={
									<>
										<div class="text-sm">No</div>
										<div class="text-sm">EXP</div>
									</>
								}
								when={(() => {
									const exp =
										model().expirationDate
									return (
										O.isSome(exp) && exp.value
									)
								})()}>
								{expiration => (
									<>
										<div class="text-sm">
											{format(expiration(), 'd')}
										</div>
										<div class="text-sm">
											{format(
												expiration(),
												'LLL',
											)}
										</div>
									</>
								)}
							</Show>
						</div>
						<div
							slot="headline"
							class="text-ellipsis whitespace-nowrap capitalize">
							{model().name}
						</div>
					</md-list-item>
				</div>
			)}
		</Show>
	)
}
