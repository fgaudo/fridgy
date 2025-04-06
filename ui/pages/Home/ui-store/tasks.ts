import type { Task } from '$lib/ui/core/solid.ts';

import { Eff } from '$lib/core/imports';

import type { State } from '../store';
import { InternalMessage } from './actions';

export const queueOpenAddFoodPage = (): Task<
	State,
	InternalMessage
> => ({
	effect: () =>
		Eff.gen(function* () {
			yield* Eff.sleep(75);

			return InternalMessage.OpenAddFoodPage();
		}),
});
