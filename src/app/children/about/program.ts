import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Licenses from '#infrastructure/licenses/licenses.ts'
import { openLink } from '#infrastructure/links/links.ts'
import { version } from '#package.json'

export type State = Readonly<{
  /** Whether the page is scrolled to its top, where the top app bar rests on the surface. */
  isAtTop: boolean
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<Licenses.License> }>
  }>
}>

type Own = Data.TaggedEnum<{
  /** The top app bar's back arrow. */
  Closed: object
  /** The list scrolled, to `offset` pixels from its top. */
  Scrolled: { offset: number }
  /** A link of the page, which opens `url` on every press. */
  LinkPressed: { url: string }
  // From commands.
  LicensesLoaded: { licenses: ReadonlyArray<Licenses.License> }
}>

const Own = Data.taggedEnum<Own>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Command = Data.TaggedEnum<{ LoadLicenses: object; OpenLink: { url: string } }>

const Command = Data.taggedEnum<Command>()

/** The platform's back button, which the root tells the page shown. */
export type External = Readonly<{ _tag: 'BackPressed' }>

const loadLicenses = Effect.fn('LoadLicenses')(
  function*() {
    return Opt.some(Own.LicensesLoaded({ licenses: yield* Licenses.all }))
  },
  Effect.withLogSpan('LoadLicenses'),
)

/** The links of the page's own card, in the order it draws them. */
const linkUrls = {
  license: 'https://spdx.org/licenses/AGPL-3.0-or-later.html',
  source: 'https://github.com/fgaudo/fridgy',
  openFoodFacts: 'https://openfoodfacts.org',
  openDatabaseLicense: 'https://opendatacommons.org/licenses/odbl/1-0/',
  privacyPolicy: 'https://github.com/fgaudo/fridgy/blob/main/PRIVACY.md',
  issues: 'https://github.com/fgaudo/fridgy/issues',
} as const

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
  maybeRepository: Opt.Option<Readonly<{ url: string; open: Own }>>
}>

export type Model = Readonly<{
  back: Own
  /** Filled by the list with its offset, at each scroll. */
  scrolled: Readonly<{ _tag: 'Scrolled' }>
  /** The top app bar takes a container's color once the page scrolls under it. */
  isAtTop: boolean
  /** What each link of the page's own card sends. */
  links: Readonly<{ [Link in keyof typeof linkUrls]: Own }>
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ cards: ReadonlyArray<LicenseCard> }>
  }>
  /** The app's version, as the build has it. */
  version: string
}>

// What the licenses list gives is loosely typed: a field may be there and blank.
const nonBlank = (maybeText: Opt.Option<string>) => Opt.filter(maybeText, (text) => text.trim().length > 0)

const cardOf = (license: Licenses.License): LicenseCard => ({
  key: license.packageName,
  title: Opt.getOrElse(nonBlank(license.name), () => license.packageName),
  maybeLicenses: nonBlank(license.licenses),
  maybeDescription: nonBlank(license.description),
  lines: Arr.getSomes([
    nonBlank(license.copyright),
    Opt.orElse(nonBlank(license.publisher), () => nonBlank(license.email)),
  ]),
  maybeRepository: Opt.map(nonBlank(license.repository), (url) => ({ url, open: Own.LinkPressed({ url }) })),
})

const { make } = Tea.program<{
  state: State
  model: Model
  message: Own
  command: Command
  event: Event
  external: External
}>()

export const program = make({
  init: {
    state: { isAtTop: true, licenses: { _tag: 'Loading' } },
    commands: [Command.LoadLicenses()],
  },

  update: Match.typeTags<Own, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Only the load leaves `Loading`, and each visit of the page loads once.
    LicensesLoaded: ({ licenses }) => (state) =>
      state.licenses._tag === 'Loading'
        ? { state: { ...state, licenses: { _tag: 'Loaded', items: licenses } } }
        : Tea.defect('the licenses are loaded once'),

    // Each press asks the parent to leave, which removes the page on the first one.
    Closed: () => (state) => ({ state, events: [Event.LeaveRequested()] }),

    // The page scrolls often, and only a change draws a frame: the very same state while it stays on the same side
    // of its top.
    Scrolled: ({ offset }) => (state) => {
      const isAtTop = offset <= 0
      return isAtTop === state.isAtTop ? { state } : { state: { ...state, isAtTop } }
    },

    LinkPressed: ({ url }) => (state) => ({ state, commands: [Command.OpenLink({ url })] }),
  }),

  runCommand: Match.typeTags<Command>()({
    LoadLicenses: loadLicenses,
    OpenLink: openLink,
  }),

  external: () => (state) => ({ state, events: [Event.LeaveRequested()] }),

  makeModel: (state) => ({
    back: Own.Closed(),
    scrolled: { _tag: 'Scrolled' } as const,
    isAtTop: state.isAtTop,
    links: {
      license: Own.LinkPressed({ url: linkUrls.license }),
      source: Own.LinkPressed({ url: linkUrls.source }),
      openFoodFacts: Own.LinkPressed({ url: linkUrls.openFoodFacts }),
      openDatabaseLicense: Own.LinkPressed({ url: linkUrls.openDatabaseLicense }),
      privacyPolicy: Own.LinkPressed({ url: linkUrls.privacyPolicy }),
      issues: Own.LinkPressed({ url: linkUrls.issues }),
    },
    licenses: state.licenses._tag === 'Loaded'
      ? { _tag: 'Loaded', cards: Arr.map(state.licenses.items, cardOf) }
      : { _tag: 'Loading' },
    version,
  }),
})

export type Message = Tea.MessageOf<typeof program>
