// The page that adds products, one after another, in two steps: the name, typed or scanned, then the expiration
// date, which the child `Expiration` holds. A product added enters the child `Fridge`, and starts the next at the
// name. A failure is told by the child `Snackbar`. The concerns are modules: the name with its lookup, the scanner,
// and the product with its submission; the page itself is here.
import * as Tea from '@fgaudo/effect-tea'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Expiration from '#app/programs/expiration/program.ts'
import * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import type * as Product from '#domain/product.ts'
import { type Feedback, vibrate } from '#infrastructure/haptics/haptics.ts'
import { insetsAs, type Keyboard } from '#infrastructure/keyboard/keyboard.ts'
import { openLink } from '#infrastructure/links/links.ts'
import { every } from '#libs/timers/timers.ts'
import * as Fridge from './children/fridge/program.ts'
import * as Name from './name.ts'
import * as Scanner from './scanner.ts'
import * as Submission from './submission.ts'

/** What failed: the snackbar says so. */
export type Failure = 'AddFailed' | 'OrderNotKept'

/** The step a product is being added from, to come back to. */
export type Step = 'Naming' | 'Dating'

export type Phase = Data.TaggedEnum<{
  /** The first step: the name. */
  Naming: object
  /**
   * The first step while the scanned barcode is looked up, the name emptied and the lookup's: it takes nothing
   * typed. Left by the answer or a cancel.
   */
  LookingUp: Readonly<{ barcode: string }>
  /** The scanner's dialog, over the first step. */
  Scanning: object
  /** The second step: the expiration date, which the child `Expiration` holds. */
  Dating: object
  /** The product is being added, from a step's button, after which the next product starts at the name. */
  Submitting: Readonly<{ product: Product.Product; from: Step }>
}>

/** The phase, and what is kept in every one: a product being added does not interrupt the next one. */
export type State = Readonly<{
  phase: Phase
  /** The name, as typed. */
  maybeName: Opt.Option<string>
  /** Bumped each time the program replaces the name (a scan, a clearing, a product found): the field is drawn anew. */
  replacements: number
  camera: Scanner.Camera
  lookup: Name.Lookup
  /** The current time, in the device's zone, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Zoned>
  /** How far the keyboard covers the page's bottom, in dp, navigation bar included: the window is never resized. */
  keyboardInset: number
}>

/** The page's own messages. */
type Page = Data.TaggedEnum<{
  // From the view.
  /** The page's close button, on the first step. */
  Closed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Zoned }
  /** The keyboard has come up, changed height or gone down. */
  KeyboardMoved: { inset: number }
}>

const Page = Data.taggedEnum<Page>()

type Own = Page | Name.Message | Scanner.Message | Submission.Message

export type Command = Data.TaggedEnum<{
  /** Asks whether the device can read barcodes. */
  CheckCamera: object
  /** Adds a product that `update` has already validated. */
  Add: { product: Product.Product }
  Vibrate: { feedback: Feedback }
  OpenLink: { url: string }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

/** The platform's back button, which the root tells the page shown. */
export type External = Readonly<{ _tag: 'BackPressed' }>

type Key = 'clock' | 'keyboard' | Scanner.Key | Name.Key

/** The snackbar over the page: the failure told, drawn anew for each id. */
export type SnackbarShown = SnackbarProgram.Model<Failure>

/** What every phase draws: how far the page keeps clear of the keyboard, which covers whatever is under it. */
type PageShown = Readonly<{ keyboardInset: number }>

/** The first step, drawn in every phase: under the scanner, and under the second step. */
export type NameShown = Readonly<{
  supporting: Name.Supporting
  /** The name field's text: what it starts from as it is drawn. */
  name: string
  /** Changes when the name is replaced by a scan, a clearing or a product found, not by typing. */
  nameKey: number
  /** Over every step, and over the scanner. */
  snackbar: SnackbarShown
}>

/** The second step, over the first. */
export type DateShown = Readonly<{
  name: string
  /**
   * The orders, the date's field, the strip under it and the keypad, which the child draws. Each visit of the step
   * is another instance of the child: its view is drawn, and sent to, by the instance's number.
   */
  expiration: Readonly<{ instance: number; model: Expiration.Model }>
}>

export type Model = Data.TaggedEnum<{
  Naming:
    & PageShown
    & NameShown
    & Readonly<{
      close: Own
      nameTyped: Name.NameTyped
      /** Empties the name, while there is one. */
      maybeClearName: Opt.Option<Own>
      /** Opens the scanner, once the device can read barcodes. */
      maybeScan: Opt.Option<Own>
      /** Goes on to the date, once the name is a product's. */
      maybeRequestDate: Opt.Option<Own>
      /** Adds the product, never expiring, once the name is a product's. */
      maybeAdd: Opt.Option<Own>
      fridge: Fridge.Model
    }>
  /** The first step during the lookup: only cancelling it and leaving the page take, and the name is read-only. */
  LookingUp:
    & PageShown
    & NameShown
    & Readonly<{
      close: Own
      cancelLookup: Own
      /** Always away: the fridge is not drawn during a lookup, and its live region is silent. */
      fridge: Fridge.Model
    }>
  /** The scanner's dialog, over the first step, which takes nothing until it closes. */
  Scanning:
    & PageShown
    & NameShown
    & Readonly<{
      /** Once unavailable, the scanner says that the name can only be typed. */
      camera: Scanner.Camera
      closeScanner: Own
    }>
  Dating:
    & PageShown
    & NameShown
    & DateShown
    & Readonly<{
      back: Own
      /** Adds the product, expiring on the day the date concludes, once it concludes one. */
      maybeAdd: Opt.Option<Own>
    }>
  /**
   * The product is being added: the step it is added from, its controls taking nothing. On the first step, the name
   * still takes what is typed, and keeps the focus and the keyboard, and the products added before go on entering
   * the fridge.
   */
  Adding:
    & PageShown
    & NameShown
    & Readonly<{
      step: Data.TaggedEnum<{
        Naming: Readonly<{
          fridge: Fridge.Model
          /** Whether the scanner opened before: the step is drawn as it was. */
          canScan: boolean
          nameTyped: Name.NameTyped
        }>
        Dating: DateShown
      }>
    }>
}>

const Snackbar = SnackbarProgram.make<Failure>()

// Refreshed often, so that the creation date is close to when the user adds the product.
const clock = every('1 second', (now) => Page.TimeChanged({ now }))

// Observed as long as the page is shown: the keyboard covers the step shown, whichever it is.
const keyboard: Tea.Subscription<Page, Keyboard> = insetsAs((inset) => Page.KeyboardMoved({ inset }))

const { child, withChildren } = Tea.program<{
  state: State
  model: Model
  message: Own
  command: Command
  event: Event
  external: External
  key: Key
}>()

const children = {
  Snackbar: child(Snackbar),
  Fridge: child(Fridge.program),
  // There while the second step is shown: a failed add gives the step back with its digits, and a product added, or
  // the step dismissed, forgets them. The next visit of the step starts anew.
  Expiration: child(Expiration.program, {
    there: (state) => Submission.showsDate(state) ? Opt.some(Submission.newDate) : Opt.none(),
    tell: (state) => ({ _tag: 'PageChanged', maybeNow: state.maybeNow, isLocked: state.phase._tag === 'Submitting' }),
  }),
}

/** What a step of the page tells its children. */
export type Tell = Tea.TellOf<typeof children>

/** What the page's functions read of its children: what the date concludes, and the notice standing. */
export type Outputs = Tea.OutputsOf<typeof children>

export type Transition = Tea.Transition<State, Command, Event, Tell>

const updatePage = Match.typeTags<Page, (state: State) => Transition>()({
  TimeChanged: ({ now }) => (state) => ({ state: { ...state, maybeNow: Opt.some(now) } }),

  KeyboardMoved: ({ inset }) => (state) => ({ state: { ...state, keyboardInset: inset } }),

  // Each press asks the parent to leave, which removes the page on the first one. Leaving while the barcode is
  // looked up interrupts the lookup, with the page.
  Closed: () => (state) =>
    state.phase._tag === 'Naming' || state.phase._tag === 'LookingUp'
      ? { state, events: [Event.LeaveRequested()] }
      : Tea.reject,
})

export const program = withChildren(children).make({
  init: {
    state: {
      phase: { _tag: 'Naming' },
      maybeName: Opt.none(),
      replacements: 0,
      camera: 'Checking',
      lookup: { _tag: 'Idle' },
      maybeNow: Opt.none(),
      keyboardInset: 0,
    },
    commands: [Command.CheckCamera()],
  },

  update: (message, children) => (state) => {
    switch (message._tag) {
      case 'Closed':
      case 'TimeChanged':
      case 'KeyboardMoved':
        return updatePage(message)(state)
      case 'NameTyped':
      case 'NameCleared':
      case 'LookupCancelled':
      case 'LinkPressed':
      case 'LookedUp':
        return Name.update(message)(state)
      case 'ScanRequested':
      case 'ScanClosed':
      case 'Scanned':
      case 'CameraFailed':
      case 'CameraChecked':
        return Scanner.update(message)(state)
      case 'DateRequested':
      case 'DateDismissed':
      case 'Started':
      case 'Completed':
        return Submission.update(message)(state, children)
    }
  },

  // The back button closes the scanner or the second step first, then leaves the page. The press is held while a
  // product is being added: the page is not left in the middle of a write.
  external: () => (state) =>
    state.phase._tag === 'Naming' || state.phase._tag === 'LookingUp'
      ? { state, events: [Event.LeaveRequested()] }
      : state.phase._tag === 'Scanning' || state.phase._tag === 'Dating'
      ? { state: { ...state, phase: { _tag: 'Naming' } } }
      : { state },

  onEvent: {
    Expiration: () => Submission.orderNotKept,
    Snackbar: () => (state) => ({ state }),
  },

  runCommand: Match.typeTags<Command>()({
    CheckCamera: Scanner.checkCamera,
    Add: Submission.add,
    Vibrate: vibrate,
    OpenLink: openLink,
  }),

  subscriptions: (state): ReadonlyArray<Key> => [
    'clock',
    'keyboard',
    ...Scanner.subscriptions(state),
    ...Name.subscriptions(state),
  ],

  listen: Match.type<Key>().pipe(
    Match.when('clock', () => clock),
    Match.when('keyboard', () => keyboard),
    Match.when('scanner', () => Scanner.scanner),
    Match.tag('Lookup', ({ barcode }) => Name.lookup(barcode)),
    Match.exhaustive,
  ),

  makeModel: (state, children): Model => {
    const name = Name.nameOf(state)
    const pageShown: PageShown = { keyboardInset: state.keyboardInset }
    const nameShown: NameShown = {
      supporting: Name.supportingOf(state),
      name,
      nameKey: state.replacements,
      snackbar: children.Snackbar(),
    }
    const maybeAdd = (step: Step) => Submission.maybeAddOf(state, step, children.Expiration.output())
    // The library starts the date in the step that shows it.
    const dateShown = (): DateShown => ({
      name,
      expiration: Opt.getOrElse(
        Opt.all({ instance: children.Expiration.instance(), model: children.Expiration() }),
        () => Tea.defect('The second step is shown, and its date is not there'),
      ),
    })
    return Match.valueTags(state.phase, {
      // Both ways out need the product the name describes, never expiring: the date is that product's.
      Naming: (): Model => ({
        _tag: 'Naming',
        ...pageShown,
        ...nameShown,
        close: Page.Closed(),
        nameTyped: Name.nameTyped,
        maybeClearName: Name.maybeClearNameOf(state),
        maybeScan: Scanner.maybeScanOf(state),
        maybeRequestDate: Submission.maybeRequestDateOf(state),
        maybeAdd: maybeAdd('Naming'),
        fridge: children.Fridge(),
      }),
      LookingUp: (): Model => ({
        _tag: 'LookingUp',
        ...pageShown,
        ...nameShown,
        close: Page.Closed(),
        cancelLookup: Name.cancelLookup,
        fridge: { _tag: 'Away' },
      }),
      Scanning: (): Model => ({
        _tag: 'Scanning',
        ...pageShown,
        ...nameShown,
        camera: state.camera,
        closeScanner: Scanner.closeScanner,
      }),
      Dating: (): Model => ({
        _tag: 'Dating',
        ...pageShown,
        ...nameShown,
        ...dateShown(),
        back: Submission.back,
        maybeAdd: maybeAdd('Dating'),
      }),
      Submitting: ({ from }): Model => ({
        _tag: 'Adding',
        ...pageShown,
        ...nameShown,
        step: from === 'Naming'
          ? { _tag: 'Naming', fridge: children.Fridge(), canScan: Scanner.canScan(state), nameTyped: Name.nameTyped }
          : { _tag: 'Dating', ...dateShown() },
      }),
    })
  },
})

export type Message = Tea.MessageOf<typeof program>
