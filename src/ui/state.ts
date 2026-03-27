import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Newtype from 'effect/Newtype'
import * as Struct from 'effect/Struct'
import * as T from 'effect/Tuple'

import type { UseCase as UC } from '@/business/index.ts'
import type { Update } from '@/core/state-manager.ts'

import * as Home from './home/slice.ts'

export type Message = Newtype.Newtype<
	'RootMessage',
	Data.TaggedEnum<{
		GotHomeMsg: Home.Message
	}>
>
const messageIso = Newtype.makeIso<Message>()
type RawMessage = Newtype.Newtype.Carrier<Message>
const RawMessage = Data.taggedEnum<RawMessage>()

export type State = Newtype.Newtype<
	'RootState',
	Data.TaggedEnum<{
		Home: Home.State
		AddProduct: {}
	}>
>
const stateIso = Newtype.makeIso<State>()
type RawState = Newtype.Newtype.Carrier<State>
const RawState = Data.taggedEnum<RawState>()

export const update: Update<State, Message, UC.All> = message => state => {
	const rawMessage = messageIso.get(message)
	const rawState = stateIso.get(state)

	const [newState, commands] = Match.type<{
		message: RawMessage
		state: RawState
	}>().pipe(
		Match.when(
			{ message: RawMessage.$is('GotHomeMsg'), state: RawState.$is('Home') },
			({ message, state }) => {
				const [newState, cmds] = Home.update(message)(state)

				return T.make(
					RawState.Home(newState),
					Arr.map(cmds, Effect.map(RawMessage.GotHomeMsg)),
				)
			},
		),
		Match.orElse(({ state }) => T.make(state, [])),
	)({ message: rawMessage, state: rawState })

	return [
		stateIso.set(newState),
		Arr.map(commands, Effect.map(messageIso.set)),
	] as const
}
