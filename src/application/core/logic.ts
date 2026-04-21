import type * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import type * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import { InternalMessage } from '@/app/core/messages.ts'
import type * as UC from '@/app/use-cases/index.ts'
import type * as StateManager from '@/shared/fsm.ts'

import { mapSubscriptions } from '../../shared/helpers.ts'
import * as Home from './home/logic.ts'
import { Page, type State } from './model.ts'

const isHomeMessage = (
	message: InternalMessage,
): message is Extract<InternalMessage, Record<'_tag', `Home_${string}`>> =>
	message._tag.startsWith('Home_')

export const update: StateManager.Update<State, InternalMessage, UC.All> =
	message => state => {
		if (state.currentPage._tag === 'Home' && isHomeMessage(message)) {
			const [nextSubState, cmds] = Home.update(message)(state.currentPage.state)
			return T.make(
				{
					...state,
					currentPage: Page.Home({ state: nextSubState }),
				},
				cmds,
			)
		}
		return Match.value(message).pipe(
			Match.withReturnType<
				ReturnType<StateManager.Update<State, InternalMessage, UC.All>>
			>(),
			Match.tag('ShowToast', ({ text }) => state => {
				const nextVersion = state.toast.version + 1n
				return T.make(
					{
						...state,
						toast: {
							...state.toast,
							maybeText: Option.some(text),
							version: nextVersion,
						},
					},
					[
						Effect.succeed(
							T.make(InternalMessage.HideToast({ version: nextVersion })),
						).pipe(Effect.delay('2 seconds')),
					],
				)
			}),
			Match.tag('HideToast', ({ version }) => state => {
				if (state.toast.version !== version) {
					return T.make(state, [])
				}
				return T.make(
					{
						...state,
						toast: {
							...state.toast,
							maybeText: Option.none(),
						},
					},
					[],
				)
			}),
			Match.orElse(() => (state: State) => T.make(state, [])),
		)(state)
	}

export const handleDefect = (_err: unknown) => T.make(InternalMessage.Crash())

export const init: StateManager.Step<
	State,
	InternalMessage,
	UC.All | Home.UseCases
> = (() => {
	const [state, commands] = Home.init
	return T.make(
		{
			currentPage: Page.Home({ state: state }),
			toast: { maybeText: Option.none(), version: 0n },
		},
		commands,
	)
})()

export const subscriptions: StateManager.Emitter<
	State,
	InternalMessage,
	UC.All | Home.UseCases
> = state => {
	let subs = HashMap.empty<
		unknown,
		Stream.Stream<
			Array.NonEmptyReadonlyArray<InternalMessage>,
			never,
			UC.All | Home.UseCases
		>
	>()

	if (state.currentPage._tag === 'Home') {
		subs = HashMap.setMany(
			subs,
			mapSubscriptions(Home.subscriptions(state.currentPage.state), k =>
				T.make('Home', k),
			),
		)
	}
	return subs
}
