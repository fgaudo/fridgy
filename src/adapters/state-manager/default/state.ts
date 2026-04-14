import type * as Array from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import type * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import * as Home from '@/adapters/state-manager/default/home/state.ts'
import type * as StateManager from '@/core/fsm.ts'
import { Message } from '@/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/ports/outbound/model-emitter/model.ts'
import type * as UC from '@/use-cases/index.ts'

import { mapSubscriptions } from './helpers.ts'

export type State = Readonly<{
	toast: Readonly<{
		version: bigint
		maybeText: Option.Option<string>
	}>
	currentPage: Data.TaggedEnum<{
		Home: Readonly<{ state: Home.State }>
		AddProduct: Readonly<{ state: object }>
	}>
}>
const Page = Data.taggedEnum<State['currentPage']>()

const route = <S extends Parameters<typeof Page.$is>[0]>(
	pageName: S,
	updateFn: (
		m: Extract<Message, Record<'_tag', `${S}_${string}`>>,
	) => (
		s: Data.TaggedEnum.Value<State['currentPage'], S>['state'],
	) => StateManager.Step<
		Data.TaggedEnum.Value<State['currentPage'], S>['state'],
		Message,
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

export const update: StateManager.Update<State, Message, UC.All> =
	Match.type<Message>().pipe(
		route('Home', Home.update),
		Match.withReturnType<
			ReturnType<StateManager.Update<State, Message, UC.All>>
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
						T.make(Message.HideToast({ version: nextVersion })),
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

export const PageModel = Data.taggedEnum<Model['currentPage']>()

export const makeModel = (state: State): Model => {
	if (state.currentPage._tag === 'Home') {
		return {
			toast: {
				key: state.toast.version.toString(16),
				maybeText: state.toast.maybeText,
			},
			currentPage: PageModel.Home({
				model: Home.makeModel(state.currentPage.state),
			}),
		}
	}
	return {
		toast: {
			key: state.toast.version.toString(16),
			maybeText: state.toast.maybeText,
		},
		currentPage: PageModel.AddProduct({ model: {} }),
	}
}

export const handleDefect = (_err: unknown) => T.make(Message.Crash())

export const init: StateManager.Step<State, Message, UC.All | Home.UseCases> =
	(() => {
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
	Message,
	UC.All | Home.UseCases
> = state => {
	let subs = HashMap.empty<
		unknown,
		Stream.Stream<
			Array.NonEmptyReadonlyArray<Message>,
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
