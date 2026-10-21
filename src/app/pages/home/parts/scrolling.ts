// Where the list is scrolled to, and whether the user is scrolling it.
import type * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { Viewport } from '../ports/viewport.ts'

export type State = Readonly<{
  isAtTop: boolean
  isInteracting: boolean
}>

export type Message = Data.TaggedEnum<{
  AtTopChanged: { isAtTop: boolean }
  CloseToTopChanged: { isCloseToTop: boolean }
  InteractionChanged: { isInteracting: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{ ScrollToTop: object }>

const Command = Data.taggedEnum<Command>()

export type Model = State

const CLOSE_TO_TOP_THRESHOLD = 30

const scrolling = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isScrolling }) => Channel.map(isScrolling, (isInteracting) => Message.InteractionChanged({ isInteracting })),
  ),
)

const atTop = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isNearTop }) => Channel.map(isNearTop(0), (isAtTop) => Message.AtTopChanged({ isAtTop })),
  ),
)

const closeToTop = Channel.unwrap(
  Effect.map(
    Effect.service(Viewport),
    ({ isNearTop }) =>
      Channel.map(isNearTop(CLOSE_TO_TOP_THRESHOLD), (isCloseToTop) => Message.CloseToTopChanged({ isCloseToTop })),
  ),
)

export const program: Tea.Program<
  { state: State; model: Model; message: Message; command: Command; services: Viewport }
> = {
  init: { state: { isAtTop: true, isInteracting: false } },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command>>()({
    InteractionChanged: ({ isInteracting }) => (state) => ({ state: { ...state, isInteracting } }),

    AtTopChanged: ({ isAtTop }) => (state) => ({ state: { ...state, isAtTop } }),

    // Close to the top, the list snaps to it, unless the user is scrolling it.
    CloseToTopChanged: ({ isCloseToTop }) => (state) => ({
      state,
      commands: !state.isInteracting && isCloseToTop ? [Command.ScrollToTop()] : [],
    }),
  }),

  runCommand: Match.typeTags<Command>()({
    ScrollToTop: Effect.fn(function*() {
      const { scrollToTop } = yield* Viewport
      yield* scrollToTop
      return Opt.none()
    }),
  }),

  subscriptions: () =>
    HashMap.make(
      ['scrolling', scrolling],
      ['at-top', atTop],
      ['close-to-top', closeToTop],
    ),

  makeModel: (state) => state,
}
