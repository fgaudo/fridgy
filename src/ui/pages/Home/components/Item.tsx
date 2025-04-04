import type {
	DeepDestructure,
	Spread,
} from '@solid-primitives/destructure'
import { format } from 'date-fns'
import {
	type Accessor,
	type Component,
	type JSXElement,
	Match,
	Show,
	Switch,
} from 'solid-js'

import { HS, Int, O } from '$lib/core/imports.ts'

import { formatRemainingTime } from '$lib/ui/core/helpers.ts'

import { useUiStateContext } from '../context.tsx'
import type { ProductUIModel } from '../store/index.ts'
import { Message } from '../store/messages.ts'

export const Item: Component<{
	model: Spread<ProductUIModel>
	index: () => number
}> = props => {
	const {
		uiStore: [uiState],
	} = useUiStateContext()!
const asd = props.model

if(asd.isValid()) {

	asd.
}
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
						!props.model.isValid() && props.model
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
					when={(model =>
						model.isValid() && model)(
						props.model,
					)}>
					{model => (
						<Button
							index={props.index}
							model={model}>
							<div class="duration-fade relative flex h-[24px] w-[24px] items-center justify-center p-7 text-sm transition-all">
								<Show
									when={(model =>
										O.isSome(
											model.expirationDate,
										) &&
										model.expirationDate.value >
											uiState.currentTimestamp &&
										model.expirationDate.value)(
										model(),
									)}>
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
									when={(model =>
										O.isSome(
											model.expirationDate,
										) &&
										model.expirationDate.value)(
										props.model(),
									)}>
									{expirationDate => (
										<ExpirationBar
											expiration={expirationDate}
											creation={() =>
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
									when={(model =>
										O.isSome(
											model.expirationDate,
										) &&
										model.expirationDate.value)(
										model(),
									)}>
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
	creation: () => Int.Integer
}> = props => {
	const {
		uiStore: [uiState],
	} = useUiStateContext()!

	const isExpired = () =>
		props.expiration() -
			uiState.currentTimestamp <
		0

	const currentProgress = () => {
		const expiration = props.expiration()

		const totalDuration =
			expiration - props.creation()
		const remainingDuration =
			expiration - uiState.currentTimestamp

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
	model: Spread<ProductUIModel>
	index: () => number
	children: JSXElement[] | JSXElement
}> = props => {
	const {
		store: [state, dispatch],
		uiStore: [uiState],
	} = useUiStateContext()!

	const parsedId = () => {
		const id = props.model.id()

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
					'bg-secondary/10':
						props.model.isSelected(),
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
						when={(name =>
							!O.isOption(name)
								? name
								: O.isSome(name) && name.value)(
							props.model.name(),
						)}
						fallback="CORRUPTED">
						{name => name()}
					</Show>
				</div>
			</div>
		</>
	)
}
