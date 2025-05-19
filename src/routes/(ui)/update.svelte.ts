import { Da } from '$lib/core/imports.ts'

import type { Update } from '$lib/ui/adapters.ts'

import type { State } from './state.svelte.ts'

type Message = Da.TaggedEnum<{
	ClearSelected: object
	ToggleItem: {
		product: ProductViewModel
	}
	StartRefreshTime: object
	RefreshTimeResult: { timestamp: number }
	ShowSpinner: { id: symbol }
	NoOp: object
	ShowCrash: object
	RemoveToast: { id: symbol }
	ToggleMenu: object
	Crash: { message: unknown }
}>

const Message = Da.taggedEnum<Message>()

export const update: Update<
	{ state: State; viewModel: typeof uiState },
	Message,
	never
> = ({ state, viewModel }, message) => {
	return M.type<Message>().pipe(
		M.tag(`ClearSelected`, () => {
			state.selected.clear()
			return []
		}),
		M.tag(`StartRefreshTime`, () => {
			return [refreshTime]
		}),
		M.tag(`ToggleItem`, ({ product }) => {
			if (viewModel.state.isDeleteRunning) return []

			if (product.isCorrupt) {
				return []
			}

			if (viewModel.state.products === undefined) return []

			const hasSelectionStarted = state.selected.size <= 0

			if (state.selected.has(product.id)) {
				product.isSelected = false
				state.selected.delete(product.id)
				return []
			}

			state.selected.add(product.id)
			product.isSelected = true

			return [
				...(hasSelectionStarted
					? [
							Eff.promise(() =>
								Haptics.impact({
									style: ImpactStyle.Light,
								}),
							).pipe(Eff.as(Message.NoOp())),
						]
					: []),
			]
		}),
		M.tag(`RefreshTimeResult`, ({ timestamp }) => {
			state.currentTimestamp = timestamp

			return []
		}),
		M.tag(`ShowSpinner`, ({ id }) => {
			if (id !== state.spinnerTaskId) {
				return [
					Eff.logWarning(`ShowSpinner is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}
			state.isLoading = true
			return []
		}),
		M.tag(`ToggleMenu`, () => {
			state.isMenuOpen = !state.isMenuOpen
			return []
		}),
		M.tag(`RemoveToast`, ({ id }) => {
			if (id !== state.toastMessage?.id) {
				return [
					Eff.logWarning(`RemoveToast is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}

			state.toastMessage = undefined

			return []
		}),
		M.tag(`ShowCrash`, () => {
			const id = Symbol()
			state.toastMessage = {
				message: `An unexpected error occurred and the app had to be reloaded`,
				id,
				type: `error`,
			}

			return [queueRemoveToast(id)]
		}),
		M.tag(`NoOp`, () => []),
		M.tag(`Crash`, ({ message }) => []),

		M.exhaustive,
	)(message)
}
