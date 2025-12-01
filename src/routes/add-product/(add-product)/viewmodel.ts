import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { Message } from './message.ts'
import { type State, isNameValid, isSubmittable } from './state.ts'
import { update } from './update.ts'

const makeViewModel = Effect.gen(function* (): Effect.fn.Return<
	ViewModel<State, Message, 'AddProductFailed' | 'AddProductSucceeded', UC.All>
> {
	const stateManager = yield* SM.makeStateManager({
		initState: {
			isBusy: false,
			maybeExpirationDate: Option.none(),
			maybeName: Option.none(),
		},
		update,
	})

	return {
		...stateManager,
		messages: Stream.filterMap(
			stateManager.messages,
			flow(
				Match.value,
				Match.tags({
					AddProductFailed: ({ _tag }) => Option.some(_tag),
					AddProductSucceeded: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(() => Option.none()),
			),
		),
	}
})

export { makeViewModel, Message, isSubmittable, isNameValid }
