import type * as Array from 'effect/Array'
import type * as Data from 'effect/Data'
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

const route = <S extends Parameters<typeof Page.$is>[0]>(
	pageName: S,
	updateFn: (
		m: Extract<InternalMessage, Record<'_tag', `${S}_${string}`>>,
	) => (
		s: Data.TaggedEnum.Value<State['currentPage'], S>['state'],
	) => StateManager.Step<
		Data.TaggedEnum.Value<State['currentPage'], S>['state'],
		InternalMessage,
		UC.All
	>,
) =>
	Match.tagStartsWith(
		(pageName + '_') as `${S}_`,
		message => (state: State) => {
			const currentPage = state.currentPage
			if (currentPage._tag === pageName) {
				// oxlint-disable-next-line typescript/no-unsafe-argument
				const [nextSubState, cmds] = updateFn(message)(currentPage.state as any)
				return T.make(
					{
						...state,
						currentPage: { _tag: pageName, state: nextSubState },
					},
					cmds,
				)
			}
			return T.make(state, [])
		},
	)

export const update: StateManager.Update<State, InternalMessage, UC.All> =
	Match.type<InternalMessage>().pipe(
		route('Home', Home.update),
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
						version: nextVersion,
						maybeText: Option.some(text),
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
	)

export const handleDefect = (_err: unknown) => T.make(InternalMessage.Crash())

export const init: StateManager.Step<
	State,
	InternalMessage,
	UC.All | Home.UseCases
> = (() => {
	const [state, commands] = Home.init
	return T.make(
		{
			toast: { version: 0n, maybeText: Option.none() },
			currentPage: Page.Home({ state: state }),
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
