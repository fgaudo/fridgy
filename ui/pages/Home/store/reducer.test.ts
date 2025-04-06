import { effect } from '@effect/vitest';
import { describe, expect } from 'vitest';

import { Eff, HS } from '$lib/core/imports.ts';

import type { App } from '$lib/app/index.ts';

import type { State } from './index.ts';
import { Message } from './messages.ts';
import { reducer } from './reducer.ts';

describe('Home reducer', () => {
	effect('Should clear selected products', () =>
		Eff.gen(function* () {
			const state = {
				selectedProducts: HS.fromIterable([
					'asd',
				]),
			} as unknown as State;
			const [mutation] = reducer(
				{} as unknown as App,
			)(Message.ClearSelectedProducts());

			mutation(state);

			expect(
				HS.size(state.selectedProducts),
			).toStrictEqual(0);

			yield* Eff.void;
		}),
	);
});
