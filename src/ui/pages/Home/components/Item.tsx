import { format } from 'date-fns'
import {
	type Component,
	type JSXElement,
	Match,
	Show,
	Switch,
} from 'solid-js'

import { HS, Int, NETS, O } from '@/core/imports'

import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { formatRemainingTime } from '@/ui/core/helpers'

import { useUiStateContext } from '../context'
import { Message } from '../store/actions'

export const Item: Component<{
	model: ProductModel
	index: () => number
}> = props => {
	const {
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<div
			class="absolute transition-all duration-fade"
			style={{
				top: `${(props.index() * 60).toString(10)}px`,
				left: '0',
				right: '0',
			}}>
			<Switch>
				<Match
					when={
						!props.model.isValid && props.model
					}>
					{model => (
						<Button
							index={props.index}
							model={model}>
							<Show
								when={(() => {
									const m = model()
									return (
										O.isSome(m.id) && m.id.value
									)
								})()}>
								{id => (
									<div slot="end-icon">
										<CheckBoxes id={id} />
									</div>
								)}
							</Show>
						</Button>
					)}
				</Match>
				<Match
					when={
						props.model.isValid && props.model
					}>
					{model => (
						<Button
							index={props.index}
							model={model}>
							<div
								slot="end-icon"
								class="relative flex h-[24px] w-[24px] items-center justify-center text-sm transition-all duration-fade">
								<CheckBoxes
									id={() => model().id}
								/>
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

							<div slot="description">
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
								slot="icon"
								class="flex w-[26px] flex-col items-center text-primary">
								<Show
									fallback={
										<>
											<mdui-icon
												class="scale-75"
												prop:name="all_inclusive"></mdui-icon>
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
										</>
									)}
								</Show>
							</div>
						</Button>
					)}
				</Match>
			</Switch>
		</div>
	)
}

const ExpirationBar: Component<{
	expiration: () => Int.Integer
	creation: Int.Integer
}> = props => {
	const {
		uiStore: [uiState],
	} = useUiStateContext()!

	const isExpired = () =>
		props.expiration() -
			uiState.currentTimestamp <
		0

	const currentProgress = () => {
		const totalDuration =
			props.expiration() - props.creation
		const remainingDuration =
			props.expiration() -
			uiState.currentTimestamp

		return remainingDuration / totalDuration
	}

	return (
		<Show
			fallback={
				<div class="mt-[5px] h-[5px] w-full border-[1px] border-primary">
					<div
						class="h-full bg-primary transition-all"
						style={{
							width: `${(
								currentProgress() * 100
							).toString()}%`,
						}}></div>
				</div>
			}
			when={isExpired()}>
			<p class="font-bold text-red-500">
				Expired
			</p>
		</Show>
	)
}

const CheckBoxes: Component<{
	id: () => string
}> = props => {
	const {
		store: [state],
		uiStore: [uiState],
	} = useUiStateContext()!
	return (
		<>
			<mdui-icon
				prop:name="check_box_outline_blank"
				classList={{
					'opacity-0':
						HS.has(props.id())(
							state.selectedProducts,
						) || !uiState.isSelectModeEnabled,
				}}
				class="absolute text-primary transition-all duration-fade"></mdui-icon>
			<mdui-icon
				prop:name="check_box"
				classList={{
					'opacity-0':
						!HS.has(props.id())(
							state.selectedProducts,
						) || !uiState.isSelectModeEnabled,
				}}
				class="absolute text-primary transition-all duration-fade"></mdui-icon>
		</>
	)
}

const Button: Component<{
	model: () => ProductModel
	index: () => number
	children: JSXElement[] | JSXElement
}> = props => {
	const {
		store: [state, dispatch],
		uiStore: [uiState],
	} = useUiStateContext()!

	const parsedId = () => {
		const id = props.model().id

		return typeof id === 'string'
			? id
			: O.isSome(id)
				? id.value
				: undefined
	}

	return (
		<>
			<mdui-list-item
				class="min-h-[60px] w-full"
				style={{
					'content-visibility': 'auto',
				}}
				classList={{
					'bg-surface-variant': (() => {
						const id = parsedId()
						return id
							? HS.has(id)(state.selectedProducts)
							: false
					})(),
				}}
				onClick={e => {
					e.preventDefault()

					const id = parsedId()
					if (id && uiState.isSelectModeEnabled) {
						dispatch(
							Message.ToggleItem({
								id,
							}),
						)
					}
				}}
				onContextMenu={e => {
					e.preventDefault()

					const id = parsedId()

					if (
						id &&
						!uiState.isSelectModeEnabled
					) {
						dispatch(
							Message.ToggleItem({
								id,
							}),
						)
					}
				}}>
				{props.children}
				<div class="overflow-hidden text-ellipsis whitespace-nowrap capitalize">
					<Show
						when={(() => {
							const name = props.model().name
							if (!O.isOption(name)) return name

							return O.isSome(name) && name.value
						})()}
						fallback="CORRUPTED">
						{name => NETS.toString(name())}
					</Show>
				</div>
			</mdui-list-item>
		</>
	)
}
