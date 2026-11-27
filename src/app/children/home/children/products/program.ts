// The stored products, as of the latest change of the storage, and the selection of some of them for deletion. The
// selection follows the list, so they are one program, in modules by concern: the list, the selection with its
// deletion and its undo, and the clock. Its child, the snackbar, tells of the last deletion, or of a failure.
import * as Tea from '@fgaudo/effect-tea'
import type * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import type * as Domain from '#domain/product.ts'
import { type Feedback, vibrate } from '#infrastructure/haptics/haptics.ts'
import type * as NonEmptyHashSet from '#libs/collections/non-empty-hash-set.ts'
import * as Clock from './clock.ts'
import * as List from './list.ts'
import * as Selection from './selection.ts'

export type State = Readonly<{
  /** The current time, in the device's zone, while the clock runs (`clock.ts`). */
  maybeNow: Opt.Option<DateTime.Zoned>
  list: List.List
  selection: Selection.Selection
}>

/** The program's own messages: its child's are made by `withChildren`. */
type Own = List.Message | Selection.Message | Clock.Message

export type Command = Data.TaggedEnum<{
  Delete: { ids: NonEmptyHashSet.NonEmptyHashSet<Domain.ProductId> }
  Restore: { products: Arr.NonEmptyReadonlyArray<Domain.Product> }
  Vibrate: { feedback: Feedback }
}>

export type Event = Data.TaggedEnum<{
  /** The product to edit, as the row shows it. */
  EditRequested: { id: Domain.ProductId; product: Domain.Product }
}>

type Key = List.Key | Clock.Key

export type Model = Readonly<{
  list: List.ListModel
  snackbar: Selection.SnackbarModel
}>

/** The platform's back button, which Home tells while the output says that a press is the list's. */
export type External = Readonly<{ _tag: 'BackPressed' }>

/** Whether a press of the back button is the list's: while it shows a selection, to clear or to hold the press for. */
export type Output = Readonly<{ takesBack: boolean }>

const Snackbar = SnackbarProgram.make<Selection.Notice>()

const { child, withChildren } = Tea.program<{
  state: State
  model: Model
  message: Own
  command: Command
  event: Event
  external: External
  output: Output
  key: Key
}>()

const children = { Snackbar: child(Snackbar) }

/** What a step of the program tells its child. */
export type Tell = Tea.TellOf<typeof children>

/** What the program's functions read of its child: the notice standing. */
export type Outputs = Tea.OutputsOf<typeof children>

export type Step = Tea.Step<State, Command, Event, Tell>

export type Transition = Tea.Transition<State, Command, Event, Tell>

export const program = withChildren(children).make({
  init: {
    state: {
      maybeNow: Opt.none(),
      list: { _tag: 'Loading' },
      selection: { _tag: 'Idle' },
    },
  },

  update: (message, children) => (state) => {
    switch (message._tag) {
      case 'ListChanged':
      case 'RowsSettled':
        return List.update(message)(state)
      case 'ItemSelected':
      case 'ItemDeselected':
      case 'EditRequested':
      case 'SelectionCleared':
      case 'DeleteStarted':
      case 'UndoRequested':
      case 'Deleted':
      case 'DeleteFailed':
      case 'RestoreFailed':
        return Selection.update(message)(state, children)
      case 'TimeChanged':
        return Clock.update(message)(state)
    }
  },

  external: () => Selection.backPressed,

  output: (state) => ({ takesBack: Selection.showsSelection(state) }),

  // The snackbar's notice has stood its time: nothing is left to do.
  onEvent: { Snackbar: () => (state) => ({ state }) },

  runCommand: Match.typeTags<Command>()({
    Delete: Selection.deleteProducts,
    Restore: Selection.restoreProducts,
    Vibrate: vibrate,
  }),

  subscriptions: (state): ReadonlyArray<Key> => [
    ...List.subscriptions(state),
    ...Clock.subscriptions(state),
  ],

  listen: Match.type<Key>().pipe(
    Match.when('changes', () => List.changes),
    Match.tag('Settling', () => List.settlingTimer),
    Match.when('clock', () => Clock.clock),
    Match.exhaustive,
  ),

  makeModel: (state, children) => ({
    list: List.model(state),
    snackbar: Selection.snackbarModel(children.Snackbar(), children.Snackbar.output()),
  }),
})

export type Message = Tea.MessageOf<typeof program>
