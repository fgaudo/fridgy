import { produce } from 'solid-js/store'

import { Da, HS, M } from '@/core/imports'

import type { Reducer } from '@/ui/core/solid.ts'

import type { InternalMessage } from './actions.ts'
import type { UiState } from './index.ts'

export const reducer: () => Reducer<
	UiState,
	InternalMessage
> = () => msg =>
	M.value(msg).pipe(
		M.when({ _tag: 'OpenAddFoodPage' }, () =>
			Da.tuple(
				produce((state: UiState) => {
					state.isOpeningAddProduct = true
				}),
				HS.empty(),
			),
		),
		M.exhaustive,
	)
