import * as Chunk from 'effect/Chunk'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import * as Command from './command.ts'
import type { Message } from './message.ts'
import * as State from './state.ts'

const matcher = Match.typeTags<
	Message,
	ReturnType<SM.Update<State.State, Message, UC.All>>
>()

export const update: SM.Update<State.State, Message, UC.All> = matcher({
	NoOp: () => state => ({ state, commands: Chunk.empty() }),

	SetName: message => state => {
		if (state.isAdding) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return {
			state: {
				...state,
				maybeName: Option.some(message.name),
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	},
	SetExpiration: message => state => {
		if (state.isAdding) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return {
			state: {
				...state,
				maybeExpirationDate: message.maybeExpirationDate,
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	},
	StartAddProduct: message => state => {
		if (!State.isSubmittable(state)) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return {
			state: { ...state, isAdding: true } satisfies State.State,
			commands: Chunk.make(
				Command.addProduct({
					maybeExpirationDate: state.maybeExpirationDate,
					name: state.maybeName.value,
				}),
			),
		}
	},
	AddProductSucceeded: message => state => {
		if (!state.isAdding) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return {
			state: {
				...state,
				isAdding: false,
				maybeExpirationDate: Option.none(),
				maybeName: Option.none(),
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	},
	AddProductFailed: message => state => {
		if (!state.isAdding) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}
		return {
			state: { ...state, isAdding: false } satisfies State.State,
			commands: Chunk.empty(),
		}
	},
})
