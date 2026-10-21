import type * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Random from 'effect/Random'
import { type License, Licenses } from './ports/licenses.ts'
import { Sayings } from './ports/sayings.ts'

export type State = Readonly<{
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<License> }>
  }>
  saying: Data.TaggedEnum<{
    Loading: object
    Picked: Readonly<{ maybeSaying: Opt.Option<string> }>
  }>
}>

export type ExternalMessage = Data.TaggedEnum<{
  /** Android's back button, while the page is shown; the page's own back button sends it too. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    // From commands.
    LicensesLoaded: { licenses: ReadonlyArray<License> }
    SayingPicked: { maybeSaying: Opt.Option<string> }
  }>

const Message = Data.taggedEnum<Message>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Command = Data.TaggedEnum<{ PickSaying: object; LoadLicenses: object }>

const Command = Data.taggedEnum<Command>()

export type Deps = Licenses | Sayings

export type Model = Readonly<{
  back: Tea.Offered<Message>
  licenses: State['licenses']
  /** Empty until a saying has been picked, or when there is none. */
  saying: string
}>

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: Deps
  event: Event
  external: ExternalMessage
}> = {
  init: {
    state: { licenses: { _tag: 'Loading' }, saying: { _tag: 'Loading' } },
    commands: [Command.LoadLicenses(), Command.PickSaying()],
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    LicensesLoaded: ({ licenses }) => (state) => ({
      state: { ...state, licenses: { _tag: 'Loaded', items: licenses } },
    }),

    SayingPicked: ({ maybeSaying }) => (state) => ({
      state: { ...state, saying: { _tag: 'Picked', maybeSaying } },
    }),

    BackPressed: () => (state) => ({ state, events: [Event.LeaveRequested()] }),
  }),

  runCommand: Match.typeTags<Command>()({
    LoadLicenses: Effect.fn(function*() {
      const { all } = yield* Licenses
      return Opt.some(Message.LicensesLoaded({ licenses: yield* all }))
    }),
    PickSaying: Effect.fn(function*() {
      const { all } = yield* Sayings
      const maybeSaying = yield* Effect.option(Random.choice(yield* all))
      return Opt.some(Message.SayingPicked({ maybeSaying }))
    }),
  }),

  makeModel: (state, { offer }) => ({
    back: offer(Message.BackPressed()),
    licenses: state.licenses,
    saying: state.saying._tag === 'Picked' ? Opt.getOrElse(state.saying.maybeSaying, () => '') : '',
  }),
}
