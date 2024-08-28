import { test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import { HS } from '@/core/imports.js'

import type { App } from '@/app/index.js'

import { Message } from './actions.js'
import type { State } from './index.js'
import { reducer } from './reducer.js'

describe('Home reducer', () => {
	test.concurrent(
		'Should clear selected products',
		() => {
			const state = {
				selectedProducts: HS.fromIterable([
					'asd',
				]),
			} as unknown as State
			const [mutations, actions] = reducer(
				{} as unknown as App,
			)(state, Message.ClearSelectedProducts())

			mutations.pipe(
				HS.forEach(mutation => {
					mutation(state)
				}),
			)

			expect(
				state.selectedProducts,
			).toStrictEqual(HS.empty())

			expect(actions).toStrictEqual(HS.empty())
		},
	)
})
