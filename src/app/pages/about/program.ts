import type * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { type License, Licenses } from './services/licenses/licenses.ts'
import { Version } from './services/version/version.ts'

export type State = Readonly<{
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<License> }>
  }>
  version: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ version: string }>
  }>
}>

export type ExternalMessage = Data.TaggedEnum<{
  /** The back button, while the page is shown; the page's own back button sends it too. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    // From commands.
    LicensesLoaded: { licenses: ReadonlyArray<License> }
    VersionLoaded: { version: string }
  }>

const Message = Data.taggedEnum<Message>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Command = Data.TaggedEnum<{ LoadLicenses: object; LoadVersion: object }>

const Command = Data.taggedEnum<Command>()

export type Deps = Licenses | Version

export type Model = Readonly<{
  back: Message
  licenses: State['licenses']
  /** Empty until it has been loaded. */
  version: Opt.Option<string>
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
    state: { licenses: { _tag: 'Loading' }, version: { _tag: 'Loading' } },
    commands: [Command.LoadLicenses(), Command.LoadVersion()],
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    LicensesLoaded: ({ licenses }) => (state) => ({
      state: { ...state, licenses: { _tag: 'Loaded', items: licenses } },
    }),

    VersionLoaded: ({ version }) => (state) => ({
      state: { ...state, version: { _tag: 'Loaded', version } },
    }),

    BackPressed: () => (state) => ({ state, events: [Event.LeaveRequested()] }),
  }),

  runCommand: Match.typeTags<Command>()({
    LoadLicenses: Effect.fn(function*() {
      const { all } = yield* Licenses
      return Opt.some(Message.LicensesLoaded({ licenses: yield* all }))
    }),
    LoadVersion: Effect.fn(function*() {
      const { current } = yield* Version
      return Opt.some(Message.VersionLoaded({ version: yield* current }))
    }),
  }),

  makeModel: (state) => ({
    back: Message.BackPressed(),
    licenses: state.licenses,
    version: state.version._tag === 'Loaded' ? Opt.some(state.version.version) : Opt.none(),
  }),
}
