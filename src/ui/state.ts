import * as Data from 'effect/Data'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import type * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import type { UseCase as UC } from '@/business/index.ts'
import type * as StateManager from '@/core/state-manager.ts'

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

export const update: StateManager.Update<
	State,
	Message,
	UC.All | Home.UseCases
> = message => state =>
	Match.value({ message, state }).pipe(
		Match.when(
			{ message: Message.$is('GotHomeMsg'), state: State.$is('Home') },
			({ message: { message }, state: { state } }) =>
				mapTransition(Home.update(message)(state), {
					mapState: State.Home,
					mapMessage: Message.GotHomeMsg,
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

export const fatalMessage = (_err: unknown) => Message.Crash()

export const init: StateManager.Transition<
	State,
	Message,
	UC.All | Home.UseCases
> = mapTransition(Home.init, {
	mapMessage: Message.GotHomeMsg,
	mapState: State.Home,
})

export const subscriptions: StateManager.Subscriptions<
	State,
	Message,
	UC.All | Home.UseCases
> = state => {
	let subs = HashMap.empty<
		readonly ['Home', unknown],
		Stream.Stream<Message, never, UC.All | Home.UseCases>
	>()

	if (state._tag === 'Home') {
		subs = HashMap.setMany(
			subs,
			mapSubscriptions(Home.subscriptions(state.state), {
				mapKey: k => T.make(state._tag, k),
				mapMessage: Message.GotHomeMsg,
			}),
		)
	}

	return subs
}
