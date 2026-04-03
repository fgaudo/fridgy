import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import type { UseCase as UC } from '@/business/index.ts'
import * as StateManager from '@/core/state-manager.ts'

import { mapSubscriptions, mapTransition } from './helpers.ts'
import * as Home from './home/state.ts'

export type Message = Data.TaggedEnum<{
	GotHomeMsg: { message: Home.Message }
	Crash: object
}>
export const Message = Data.taggedEnum<Message>()

export type State = Data.TaggedEnum<{
	Home: { state: Home.State }
	AddProduct: object
}>
const State = Data.taggedEnum<State>()

export const update: StateManager.Update<State, Message, UC.All> =
	message => state =>
		Match.value({ message, state }).pipe(
			Match.when(
				{ message: Message.$is('GotHomeMsg'), state: State.$is('Home') },
				({ message: { message }, state: { state } }) =>
					mapTransition({
						update: Home.update(message)(state),
						mapState: newState => State.Home({ state: newState }),
						mapMessage: message => Message.GotHomeMsg({ message }),
					}),
			),
			Match.orElse(({ state }) => T.make(state, [])),
		)

export type Model = Data.TaggedEnum<{
	Home: { model: Home.Model }
	AddProduct: object
}>
const Model = Data.taggedEnum<Model>()

export const makeModel = (state: State): Model => {
	if (state._tag === 'Home') {
		return Model.Home({ model: Home.makeModel(state.state) })
	}

	return Model.AddProduct()
}

export const fatalMessage = (err: unknown) => Message.Crash()

export const init: StateManager.Transition<State, Message, UC.All> = T.make(
	State.Home({ state: Home.init[0] }),
	Arr.map(
		Home.init[1],
		Effect.map(message => Message.GotHomeMsg({ message })),
	),
)

export const subscriptions: StateManager.Subscriptions<
	State,
	Message,
	UC.All
> = state => {
	let subs = HashMap.empty<
		readonly ['Home', unknown],
		Stream.Stream<Message, never, UC.All>
	>()

	if (state._tag === 'Home') {
		subs = HashMap.setMany(
			subs,
			mapSubscriptions({
				subscriptions: Home.subscriptions(state.state),
				mapKey: k => [state._tag, k] as const,
				mapMessage: message => Message.GotHomeMsg({ message }),
			}),
		)
	}

	return subs
}
