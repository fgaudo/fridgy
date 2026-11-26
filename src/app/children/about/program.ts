import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { type License, Licenses } from './services/licenses/licenses.ts'
import { Version } from './services/version/version.ts'

export type State = Readonly<{
  /** Whether the page is scrolled to its top, where the top app bar rests on the surface. */
  isAtTop: boolean
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<License> }>
  }>
  version: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ version: string }>
  }>
}>

type Own = Data.TaggedEnum<{
  /** The page's own back button, and the platform's, while the page is shown. */
  BackPressed: object
  /** The list scrolled, to `offset` pixels from its top. */
  Scrolled: { offset: number }
  // From commands.
  LicensesLoaded: { licenses: ReadonlyArray<License> }
  VersionLoaded: { version: string }
}>

const Own = Data.taggedEnum<Own>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Command = Data.TaggedEnum<{ LoadLicenses: object; LoadVersion: object }>

const Command = Data.taggedEnum<Command>()

const backButton: Tea.Subscription<Own, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Own.BackPressed())),
)

const loadLicenses = Effect.fn('LoadLicenses')(
  function*() {
    const { all } = yield* Licenses
    return Opt.some(Own.LicensesLoaded({ licenses: yield* all }))
  },
  Effect.withLogSpan('LoadLicenses'),
)

const loadVersion = Effect.fn('LoadVersion')(
  function*() {
    const { current } = yield* Version
    return Opt.some(Own.VersionLoaded({ version: yield* current }))
  },
  Effect.withLogSpan('LoadVersion'),
)

/** A package's card: what is known of it, with nothing blank. */
export type LicenseCard = Readonly<{
  /** The package's name and version, unique among the cards. */
  key: string
  /** The package's name, or its key when it has none. */
  title: string
  maybeLicenses: Opt.Option<string>
  maybeDescription: Opt.Option<string>
  /** The copyright, then the publisher, or else their email. */
  lines: ReadonlyArray<string>
  maybeRepository: Opt.Option<string>
}>

export type Model = Readonly<{
  back: Own
  /** Filled by the list with its offset, at each scroll. */
  scrolled: Readonly<{ _tag: 'Scrolled' }>
  /** The top app bar takes a container's color once the page scrolls under it. */
  isAtTop: boolean
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ cards: ReadonlyArray<LicenseCard> }>
  }>
  version: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ version: string }>
  }>
}>

// What the licenses list gives is loosely typed: a field may be there and blank.
const nonBlank = (maybeText: Opt.Option<string>) => Opt.filter(maybeText, (text) => text.trim().length > 0)

const cardOf = (license: License): LicenseCard => ({
  key: license.packageName,
  title: Opt.getOrElse(nonBlank(license.name), () => license.packageName),
  maybeLicenses: nonBlank(license.licenses),
  maybeDescription: nonBlank(license.description),
  lines: Arr.getSomes([
    nonBlank(license.copyright),
    Opt.orElse(nonBlank(license.publisher), () => nonBlank(license.email)),
  ]),
  maybeRepository: nonBlank(license.repository),
})

const { make } = Tea.program<{
  state: State
  model: Model
  message: Own
  command: Command
  event: Event
  key: 'back-button'
}>()

export const program = make({
  init: {
    state: { isAtTop: true, licenses: { _tag: 'Loading' }, version: { _tag: 'Loading' } },
    commands: [Command.LoadLicenses(), Command.LoadVersion()],
  },

  update: Match.typeTags<Own, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Only the load leaves `Loading`, and each visit of the page loads once.
    LicensesLoaded: ({ licenses }) => (state) =>
      state.licenses._tag === 'Loading'
        ? { state: { ...state, licenses: { _tag: 'Loaded', items: licenses } } }
        : Tea.defect('the licenses are loaded once'),

    VersionLoaded: ({ version }) => (state) =>
      state.version._tag === 'Loading'
        ? { state: { ...state, version: { _tag: 'Loaded', version } } }
        : Tea.defect('the version is loaded once'),

    BackPressed: () => (state) => ({ state, events: [Event.LeaveRequested()] }),

    // The page scrolls often, and only a change draws a frame: the very same state while it stays on the same side
    // of its top.
    Scrolled: ({ offset }) => (state) => {
      const isAtTop = offset <= 0
      return isAtTop === state.isAtTop ? { state } : { state: { ...state, isAtTop } }
    },
  }),

  runCommand: Match.typeTags<Command>()({
    LoadLicenses: loadLicenses,
    LoadVersion: loadVersion,
  }),

  subscriptions: () => ['back-button'],

  listen: () => backButton,

  makeModel: (state) => ({
    back: Own.BackPressed(),
    scrolled: { _tag: 'Scrolled' } as const,
    isAtTop: state.isAtTop,
    licenses: state.licenses._tag === 'Loaded'
      ? { _tag: 'Loaded', cards: Arr.map(state.licenses.items, cardOf) }
      : { _tag: 'Loading' },
    version: state.version,
  }),
})

export type Message = Tea.MessageOf<typeof program>
