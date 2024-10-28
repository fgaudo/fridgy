import { test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { HS } from '@/core/imports.ts'

import type { App } from '@/app/index.ts'

import { Message } from './actions.ts'
import type { State } from './index.ts'
import { reducer } from './reducer.ts'

describe('Home reducer', () => {
	test.concurrent(
		'Should clear selected products',
		() => {
			const state = {
				selectedProducts: HS.fromIterable([
					'asd',
				]),
			} as unknown as State
			const [mutations] = reducer(
				{} as unknown as App,
			)(state, Message.ClearSelectedProducts())

			mutations.pipe(
				HS.forEach(mutation => {
					mutation(state)
				}),
			)
			expect(
				HS.size(state.selectedProducts),
			).toStrictEqual(0)
		},
	)
})
