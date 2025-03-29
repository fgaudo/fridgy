import { format } from 'date-fns'
import {
	type Component,
	type JSXElement,
	Match,
	Show,
	Switch,
} from 'solid-js'

import { HS, Int, O } from '@/core/imports.ts'

import type { ProductModel } from '@/app/use-cases/get-sorted-products.ts'

import { formatRemainingTime } from '@/ui/core/helpers.ts'

import { useUiStateContext } from '../context.tsx'
import { Message } from '../store/actions.ts'

export const Item: Component<{
	model: ProductModel
	index: () => number
}> = props => {
	const {
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<div
			class="duration-fade absolute flex shadow-sm transition-all"
			style={{
				top: `${(props.index() * 65).toString(10)}px`,
				left: '4px',
				right: '4px',
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
							<div></div>
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
							<div class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm transition-all">
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
											class="text-primary duration-fade absolute text-xs transition-all"
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

							<div>
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

							<div class="text-secondary flex w-[26px] flex-col items-center">
								<Show
									fallback={
										<>
											<span class="material-symbols text-4xl">
												all_inclusive
											</span>
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
				<div class="border-primary mt-[5px] h-[5px] w-full border-[1px]">
					<div
						class="bg-primary h-full transition-all"
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
			<div
				class="bg-background flex min-h-[60px] w-full select-none"
				style={{
					'content-visibility': 'auto',
				}}
				classList={{
					'bg-secondary/10': (() => {
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
				<div class="w-full overflow-hidden text-ellipsis whitespace-nowrap capitalize">
					<Show
						when={(() => {
							const name = props.model().name
							if (!O.isOption(name)) return name

							return O.isSome(name) && name.value
						})()}
						fallback="CORRUPTED">
						{name => name()}
					</Show>
				</div>
			</div>
		</>
	)
}
