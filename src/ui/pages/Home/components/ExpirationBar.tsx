import { type Component, Show } from 'solid-js'

import { useUiStateContext } from '../context'

export const ExpirationBar: Component<{
	expiration: () => number
	creation: number
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
						class="h-full bg-primary"
						style={{
							width: `${(
								currentProgress() * 100
							).toString()}%`,
						}}
					/>
				</div>
			}
			when={isExpired()}>
			<p class="font-bold text-red-500">
				Expired
			</p>
		</Show>
	)
}
