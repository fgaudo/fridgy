import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { type License, Licenses } from './services/licenses/licenses.ts'
import { Version } from './services/version/version.ts'

export type State = Readonly<{
  /** Whether the page is scrolled to its top, where the top app bar rests on the surface: the input `Scroll`. */
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

/** The page's own messages: the writes into its input are made by `make`. */
type Own = Data.TaggedEnum<{
  /** The page's own back button, and the platform's, while the page is shown. */
  BackPressed: object
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

const { input, make } = Tea.program<{ state: State; model: Model; message: Own; command: Command; event: Event }>()

/**
 * How far the page has scrolled, in pixels from its top, as far as the top app bar tells it apart: 0 at its top, 1
 * under it. The very same state while that does not change: the page scrolls often, and only a change draws a frame.
 */
const scroll = input({
  get: (state) => Opt.some(state.isAtTop ? 0 : 1),
  set: (state, top: number) => {
    const isAtTop = top <= 0
    return isAtTop === state.isAtTop ? state : { ...state, isAtTop }
  },
})

export const program = make({
  init: {
    state: { isAtTop: true, licenses: { _tag: 'Loading' }, version: { _tag: 'Loading' } },
    commands: [Command.LoadLicenses(), Command.LoadVersion()],
  },

  inputs: { Scroll: scroll },

  update: Match.typeTags<Own, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Accepted once loaded too: a command cannot be cancelled, and its answer goes to the About shown when it
    // arrives, so a page opened again while the first visit's loads were pending hears theirs, then its own.
    LicensesLoaded: ({ licenses }) => (state) => ({
      state: { ...state, licenses: { _tag: 'Loaded', items: licenses } },
    }),

    VersionLoaded: ({ version }) => (state) => ({
      state: { ...state, version: { _tag: 'Loaded', version } },
    }),

    BackPressed: () => (state) => ({ state, events: [Event.LeaveRequested()] }),
  }),

  runCommand: Match.typeTags<Command>()({
    LoadLicenses: loadLicenses,
    LoadVersion: loadVersion,
  }),

  subscriptions: () => HashMap.make(['back-button', backButton]),

  makeModel: (state) => ({
    back: Own.BackPressed(),
    isAtTop: state.isAtTop,
    licenses: state.licenses._tag === 'Loaded'
      ? { _tag: 'Loaded', cards: Arr.map(state.licenses.items, cardOf) }
      : { _tag: 'Loading' },
    version: state.version,
  }),
})

export type Message = Tea.MessageOf<typeof program>
