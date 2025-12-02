import * as Chunk from 'effect/Chunk'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import * as Command from './command.ts'
import type { Message } from './message.ts'
import { type State, isSubmittable } from './state.ts'

const matcher = Match.typeTags<
	Message,
	ReturnType<SM.Update<State, Message, UC.All>>
>()

export const update: SM.Update<State, Message, UC.All> = matcher({
	NoOp: () => state => ({ state, commands: Chunk.empty() }),

	SetName: message => state => {
		return {
			state: {
				...state,
				maybeName: Option.some(message.name),
			} satisfies State,
			commands: Chunk.empty(),
		}
	},
	SetExpiration: message => state => {
		return {
			state: {
				...state,
				maybeExpirationDate: message.maybeExpirationDate,
			} satisfies State,
			commands: Chunk.empty(),
		}
	},
	StartAddProduct: message => state => {
		if (state.isAdding) {
			return { state, commands: Chunk.empty() }
		}

		if (isSubmittable(state)) {
			return {
				state: { ...state, isAdding: true } satisfies State,
				commands: Chunk.make(
					Command.addProduct({
						maybeExpirationDate: state.maybeExpirationDate,
						name: state.maybeName.value,
					}),
				),
			}
		}

		return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
	},
	AddProductSucceeded: () => state => {
		return {
			state: {
				...state,
				isAdding: false,
				maybeExpirationDate: Option.none(),
				maybeName: Option.none(),
			} satisfies State,
			commands: Chunk.empty(),
		}
	},
	AddProductFailed: () => state => {
		return {
			state: { ...state, isAdding: false } satisfies State,
			commands: Chunk.empty(),
		}
	},
})
