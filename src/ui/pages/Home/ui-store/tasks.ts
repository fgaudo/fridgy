import { Eff } from '@/core/imports'

import type { Task } from '@/ui/core/solid.ts'

import type { State } from '../store'
import { InternalMessage } from './actions'

export const queueOpenAddFoodPage = (): Task<
	State,
	InternalMessage
> => ({
	effect: () =>
		Eff.gen(function* () {
			yield* Eff.sleep(75)

			return InternalMessage.OpenAddFoodPage()
		}),
})
