import type { Dispatch } from '@fgaudo/effect-tea'
import * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { DateOrder } from '#libs/dates/date-order.ts'
import { handlers, initialValue, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { DateChoice, Digit, Failure, FieldsShown, Message, Model, OrderChoice, Snackbar } from './program.ts'

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

// No weekday: a date read off a package has none, and two chips must fit a row of the narrowest phone.
const formatDay = (date: DateTime.Utc) => DateTime.formatUtc(date, { day: 'numeric', month: 'short', year: 'numeric' })

const keys: ReadonlyArray<Digit> = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** How the digits are read in each order: the field's placeholder and each segment's title. */
const placeholders: Readonly<Record<DateOrder, string>> = { DMY: 'DDMMYY', MDY: 'MMDDYY', YMD: 'YYMMDD' }

const hints: Readonly<Record<DateOrder, string>> = {
  DMY: 'Day and month, then year if needed',
  MDY: 'Month and day, then year if needed',
  YMD: 'Year if needed, then month and day',
}

const orderTitles: Readonly<Record<DateOrder, string>> = {
  DMY: 'Day, month, year',
  MDY: 'Month, day, year',
  YMD: 'Year, month, day',
}

/** Whether the fields take input, and with which controls; if not, whether the product is being saved. */
type Activity = Readonly<
  { _tag: 'Editing'; controls: Model & { _tag: 'Editing' } } | { _tag: 'Saving' } | { _tag: 'Gone' }
>

const sidePadding = 'pl-[calc(1.5rem+var(--spacing-sail))] pr-[calc(1.5rem+var(--spacing-sair))]'

/** The top app bar of Material's full-screen dialog: its close button and its title. */
const appBar = (maybeClose: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <div
      props={{
        // `box-content`: the bar is 64dp below the top inset, which `pt-sait` would otherwise take from its height.
        className:
          'box-content flex h-16 shrink-0 items-center gap-1 bg-surface pt-sait pr-[calc(0.25rem+var(--spacing-sair))] pl-[calc(0.25rem+var(--spacing-sail))] text-on-surface',
      }}
    >
      <button
        attrs={{ 'aria-label': 'Close' }}
        props={{
          className:
            'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full disabled:text-on-surface/38',
          title: 'Close',
          disabled: Opt.isNone(maybeClose),
        }}
        on={Opt.match(maybeClose, { onNone: () => ({}), onSome: (close) => on('click', close) })}
      >
        close
      </button>
      <h2 props={{ className: 'truncate px-1 text-title-large-emphasized' }}>Edit product</h2>
    </div>
  )
}

/**
 * Material's filled button "Save", or "Save without date" on an empty date field, as "Add without date" on the page
 * that adds products. The circular indicator replaces its label while the product is saved.
 */
const saveButton = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeSave = activity._tag === 'Editing' ? activity.controls.maybeSave : Opt.none()
  return (
    <button
      props={{
        className: cn(
          'state-layer relative min-h-14 shrink-0 rounded-full bg-primary px-6 text-label-large text-on-primary',
          'transition-colors',
          activity._tag !== 'Saving' && 'disabled:bg-on-surface/12 disabled:text-on-surface/38',
        ),
        disabled: Opt.isNone(maybeSave),
      }}
      on={Opt.match(maybeSave, { onNone: () => ({}), onSome: (save) => on('click', save) })}
    >
      <span props={{ className: activity._tag === 'Saving' ? 'opacity-0' : 'opacity-100' }}>
        {shown.withoutDate ? 'Save without date' : 'Save'}
      </span>
      {activity._tag === 'Saving'
        ? [
          <span
            key='progress'
            props={{
              className: cn(
                'material-symbols-rounded pointer-events-none absolute inset-0 flex items-center justify-center',
                'text-[18px]',
              ),
              title: 'Saving the product',
            }}
          >
            <span props={{ className: 'animate-spin' }}>progress_activity</span>
          </span>,
        ]
        : []}
    </button>
  )
}

/**
 * Material's outlined text field of the name, drawn anew when it is cleared. Not focused when the page opens: the
 * keyboard would cover the keypad, and the user may have come for the date.
 */
const nameField = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on, onValue } = handlers(dispatch)
  const maybeClearName = activity._tag === 'Editing' ? activity.controls.maybeClearName : Opt.none()
  return (
    <div key={`name-${shown.nameKey}`} props={{ className: 'label-room relative' }}>
      <label props={{ className: 'block' }}>
        <input
          hook={{ create: initialValue(shown.name) }}
          props={{
            type: 'text',
            enterKeyHint: 'done',
            disabled: activity._tag !== 'Editing',
            placeholder: ' ',
            className: cn(
              'peer min-h-14 w-full py-3.75 rounded-extra-small border border-outline bg-transparent pl-4',
              'text-body-large text-on-surface caret-primary outline-none inset-ring-primary',
              'placeholder:text-transparent hover:border-on-surface focus:border-primary focus:inset-ring-1',
              'disabled:border-on-surface/12 disabled:text-on-surface/38',
              Opt.isSome(maybeClearName) ? 'pr-13' : 'pr-4',
            ),
          }}
          on={activity._tag === 'Editing' ? onValue('input', activity.controls.changeName, inputValue) : {}}
        />
        <span
          props={{
            className: cn(
              'pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-surface px-1 text-body-small',
              'text-on-surface-variant transition-all duration-short-3 peer-placeholder-shown:top-1/2',
              'peer-placeholder-shown:text-body-large peer-focus:top-0 peer-focus:text-body-small',
              'peer-focus:text-primary peer-disabled:text-on-surface/38',
            ),
          }}
        >
          Name
        </span>
      </label>
      {Opt.match(maybeClearName, {
        onNone: () => [],
        onSome: (clear) => [
          <button
            attrs={{ 'aria-label': 'Clear name' }}
            props={{
              className: cn(
                'state-layer material-symbols-rounded absolute top-1/2 right-1 flex h-12 w-12 -translate-y-1/2 items-center',
                'justify-center rounded-full text-on-surface-variant',
              ),
              title: 'Clear name',
            }}
            on={on('click', clear)}
          >
            cancel
          </button>,
        ],
      })}
    </div>
  )
}

/** Material's segmented button of the orders. */
const orderSegments = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const segment = ({ order, choice }: OrderChoice) => {
    const maybePick = choice._tag === 'Offered' ? choice.maybePick : Opt.none()
    return (
      <button
        attrs={{ 'aria-pressed': choice._tag === 'Current' ? 'true' : 'false' }}
        props={{ className: 'segment', disabled: activity._tag !== 'Editing', title: orderTitles[order] }}
        on={Opt.match(maybePick, { onNone: () => ({}), onSome: (pick) => on('click', pick) })}
      >
        {/* Keyed: the label must not take over the check's element, and its font, once the check goes. */}
        {choice._tag === 'Current'
          ? [
            <span
              key='check'
              attrs={{ 'aria-hidden': 'true' }}
              props={{ className: 'material-symbols-rounded text-[18px]' }}
            >
              check
            </span>,
          ]
          : []}
        <span key='label'>{order}</span>
      </button>
    )
  }
  return <div props={{ className: 'flex min-h-10' }}>{shown.orders.map(segment)}</div>
}

/**
 * Material's outlined text field of the date: read-only, typed into with the keypad, so that the thumb stays where
 * it is. The digits are shown as they are: grouping them would read them one way.
 */
const dateField = (shown: FieldsShown, activity: Activity) => {
  // Disabled while the fields take no input; in the error's colors when the digits name no day.
  const look = activity._tag !== 'Editing' ? 'Disabled' : shown.strip._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  // The margin above is the floating label's upper half, which Material's own field reserves.
  return (
    <label props={{ className: 'label-room relative block' }}>
      <input
        props={{
          type: 'text',
          readOnly: true,
          inputMode: 'none',
          disabled: look === 'Disabled',
          placeholder: placeholders[shown.order],
          value: shown.digits,
          className: cn(
            'peer min-h-14 w-full py-3.75 rounded-extra-small border bg-transparent px-4 text-body-large text-on-surface',
            'caret-transparent outline-none placeholder:text-transparent focus:inset-ring-1',
            'focus:placeholder:text-on-surface-variant disabled:border-on-surface/12 disabled:text-on-surface/38',
            look === 'Wrong'
              ? 'border-error inset-ring-error'
              : 'border-outline inset-ring-primary hover:border-on-surface focus:border-primary',
          ),
        }}
      />
      <span
        props={{
          className: cn(
            'pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-surface px-1',
            'text-body-small transition-all duration-short-3 peer-placeholder-shown:top-1/2',
            'peer-placeholder-shown:text-body-large peer-focus:top-0 peer-focus:text-body-small',
            'peer-disabled:text-on-surface/38',
            look === 'Wrong' ? 'text-error' : 'text-on-surface-variant peer-focus:text-primary',
          ),
        }}
      >
        Expiration date
      </span>
    </label>
  )
}

/** Material's filter chip of a day the digits name. */
const chip = ({ date, choice }: DateChoice, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeChoose = choice._tag === 'Offered' ? choice.maybeChoose : Opt.none()
  return (
    <button
      attrs={{ 'aria-pressed': choice._tag === 'Chosen' ? 'true' : 'false' }}
      props={{ className: 'filter-chip', disabled: activity._tag !== 'Editing' }}
      on={Opt.match(maybeChoose, { onNone: () => ({}), onSome: (choose) => on('click', choose) })}
    >
      <span attrs={{ 'aria-hidden': 'true' }} props={{ className: 'material-symbols-rounded text-[18px]' }}>
        {choice._tag === 'Chosen' ? 'check' : 'event'}
      </span>
      <span>{formatDay(date)}</span>
    </button>
  )
}

/**
 * Under the field, what it means: the hint, the chips on one line that scrolls sideways, or the error. The hint
 * stays laid out, unseen, under what replaces it, so that the strip keeps its height while the user types: nothing
 * under it moves, whatever the font's size.
 */
const strip = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => (
  <div
    props={{
      className: cn(
        'grid shrink-0 text-body-small',
        shown.strip._tag === 'NamingNothing' ? 'text-error' : 'text-on-surface-variant',
      ),
    }}
  >
    <span props={{ className: cn('col-start-1 row-start-1 px-4', shown.strip._tag !== 'Hint' && 'invisible') }}>
      {hints[shown.order]}
    </span>
    <div props={{ className: 'col-start-1 row-start-1 flex min-h-8 items-start gap-2 overflow-x-auto' }}>
      {Match.valueTags(shown.strip, {
        Hint: () => [],
        Naming: ({ choices }) => choices.map((choice) => chip(choice, activity, dispatch)),
        NamingNothing: () => [<span props={{ className: 'px-4' }}>Not an upcoming date</span>],
      })}
    </div>
  </div>
)

/** A keypad of the app's own, always where the thumb expects it: Material's tonal buttons in a button group's pills. */
const keypad = (activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const key = (label: string, maybeMessage: Opt.Option<Message>, { title = label, isIcon = false } = {}) => (
    <button
      attrs={{ 'aria-label': title }}
      props={{
        className: cn(
          'state-layer flex h-14 items-center justify-center rounded-full bg-surface-container-highest',
          'text-headline-small text-on-surface transition-colors disabled:bg-on-surface/12',
          'disabled:text-on-surface/38',
          { 'material-symbols-rounded': isIcon },
        ),
        disabled: Opt.isNone(maybeMessage),
        title,
      }}
      on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
    >
      {label}
    </button>
  )
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  const digitKey = (digit: Digit) =>
    key(digit, Opt.flatMap(controls, ({ maybeTypeDigit }) => Opt.map(maybeTypeDigit, (type) => type(digit))))
  return (
    <div props={{ className: 'grid grid-cols-3 gap-2' }}>
      {keys.map(digitKey)}
      {key('cancel', Opt.flatMap(controls, ({ maybeClearDate }) => maybeClearDate), {
        title: 'Clear date',
        isIcon: true,
      })}
      {digitKey('0')}
      {key('backspace', Opt.flatMap(controls, ({ maybeEraseDigit }) => maybeEraseDigit), {
        title: 'Backspace',
        isIcon: true,
      })}
    </div>
  )
}

/**
 * The fields read from the top, the keypad at the bottom of their column, where the thumb rests, and "Save" docked
 * under it. The column fits the reference screen, and scrolls when the screen is shorter (the keyboard open, a
 * large font): "Save" stays in sight, above the navigation bar or the keyboard.
 */
const fields = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => (
  <div key='fields' props={{ className: 'flex min-h-0 flex-1 flex-col' }}>
    <div props={{ className: cn('flex flex-1 flex-col gap-2 overflow-y-auto', sidePadding) }}>
      {nameField(shown, activity, dispatch)}
      {orderSegments(shown, activity, dispatch)}
      {dateField(shown, activity)}
      {strip(shown, activity, dispatch)}
      <div props={{ className: 'mt-auto rounded-extra-large bg-surface-container-low p-2' }}>
        {keypad(activity, dispatch)}
      </div>
    </div>
    {/* The gap above "Save" is its own, not the column's: it stays when the column scrolls under it. */}
    <div props={{ className: cn('flex shrink-0 flex-col pt-2 pb-[calc(1rem+var(--spacing-saib))]', sidePadding) }}>
      {saveButton(shown, activity, dispatch)}
    </div>
  </div>
)

const failureTexts: Readonly<Record<Failure, string>> = {
  SaveFailed: 'Couldn\'t save the product',
  OrderNotKept: 'Couldn\'t save the date order',
  ProductGone: 'This product no longer exists',
}

/**
 * Material's snackbar (`snackbar` in `styles.css`) 16dp above the docked "Save" button, keyed by its id so that the
 * next one appears anew, after this one has sunk. The place stays, so that it enters and leaves with its own
 * transitions.
 */
const snackbar = (shown: Snackbar) => (
  <div key='snackbar' props={{ className: 'snackbar-slot [--snackbar-clearance:4.5rem]' }}>
    {shown._tag === 'None' ? [] : [
      <div
        key={`snackbar-${shown.id}`}
        attrs={{ 'data-entrance': shown.entrance }}
        style={{ remove: { opacity: '0', transform: 'translateY(0.5rem)' } }}
        props={{ className: 'snackbar' }}
      >
        <span>{failureTexts[shown.failure]}</span>
      </div>,
    ]}
  </div>
)

/** Material's full-screen dialog, as a page: it rises over the page that opened it, and sinks back over it. */
export const view: View<Model, Message> = (model, dispatch) => (
  <div
    key='EditProduct'
    style={{
      transform: 'translateY(100%)',
      transition: 'transform var(--transition-duration-medium-4) var(--ease-emphasized-decelerate)',
      delayed: { transform: 'translateY(0)' },
      remove: {
        transform: 'translateY(100%)',
        pointerEvents: 'none',
        transition: 'transform var(--transition-duration-short-4) var(--ease-emphasized-accelerate)',
      },
    }}
    props={{ className: 'fixed inset-0 z-70 flex flex-col bg-surface text-on-surface' }}
  >
    {Match.valueTags(model, {
      Loading: ({ close }) => [appBar(Opt.some(close), dispatch), snackbar({ _tag: 'None' })],
      Editing: (editing) => [
        appBar(Opt.some(editing.close), dispatch),
        fields(editing, { _tag: 'Editing', controls: editing }, dispatch),
        snackbar(editing.snackbar),
      ],
      Saving: (saving) => [
        appBar(Opt.none(), dispatch),
        fields(saving, { _tag: 'Saving' }, dispatch),
        snackbar(saving.snackbar),
      ],
      Gone: (gone) => [
        appBar(Opt.some(gone.close), dispatch),
        fields(gone, { _tag: 'Gone' }, dispatch),
        snackbar(gone.snackbar),
      ],
    })}
  </div>
)
