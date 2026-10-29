import type { Dispatch } from '@fgaudo/effect-tea'
import * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import type { DateOrder } from '#libs/dates/date-order.ts'
import { piecesOf } from '#libs/strings/pieces.ts'
import { focusOnInsert, gatherAndFly, handlers, initialValue, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type {
  DateChoice,
  DateShown,
  Digit,
  Entering,
  Failure,
  Message,
  Model,
  NameShown,
  OrderChoice,
  Snackbar,
  Supporting,
} from './program.ts'

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

// No weekday: a date read off a package has none, and two chips must fit a row of the narrowest phone.
const formatDay = (date: DateTime.Utc) => DateTime.formatUtc(date, { day: 'numeric', month: 'short', year: 'numeric' })

const keys: ReadonlyArray<Digit> = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** How the digits are read in each order: the field's placeholder, the strip's hint and each segment's title. */
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

/** What the first step is doing, and which of its controls take. */
type NameActivity = Readonly<
  | { _tag: 'Editing'; controls: Model & { _tag: 'Naming' } }
  | { _tag: 'LookingUp'; controls: Model & { _tag: 'LookingUp' } }
  | { _tag: 'UnderScanner' }
  | { _tag: 'UnderDate' }
  | { _tag: 'Adding' }
>

type DateActivity = Readonly<
  { _tag: 'Editing'; controls: Model & { _tag: 'Dating' } } | { _tag: 'Adding' }
>

const stepPadding =
  'pb-[calc(1rem+var(--spacing-saib))] pl-[calc(1.5rem+var(--spacing-sail))] pr-[calc(1.5rem+var(--spacing-sair))]'

/** The top app bar of Material's full-screen dialog: its leading icon button and its title. */
const appBar = (
  title: string,
  icon: string,
  iconTitle: string,
  maybeMessage: Opt.Option<Message>,
  dispatch: Dispatch<Message>,
) => {
  const { on } = handlers(dispatch)
  return (
    <div
      props={{
        // `box-content`: the bar is 64dp below the top inset, which `pt-sait` would otherwise take from its height.
        className:
          'box-content flex h-16 shrink-0 items-center gap-1 bg-surface px-1 pt-sait pl-sail pr-sair text-on-surface',
      }}
    >
      <button
        attrs={{ 'aria-label': iconTitle }}
        props={{
          className:
            'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full disabled:text-on-surface/38',
          title: iconTitle,
          disabled: Opt.isNone(maybeMessage),
        }}
        on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
      >
        {icon}
      </button>
      <h2 props={{ className: 'truncate px-1 text-title-large-emphasized' }}>{title}</h2>
    </div>
  )
}

/** The spare height between a step's fields and its controls, given up first on a short screen, down to the scan FAB's. */
const room = (...held: ReadonlyArray<VNode>) => <div props={{ className: 'relative min-h-16 flex-1' }}>{held}</div>

/** The indicator replaces the label while the action runs, and stays while the product added leaves the step. */
type ButtonShows = 'Label' | 'Progress' | 'Acknowledging'

/**
 * Material's filled or text button. The write is mostly quicker than a frame, so the indicator would never be
 * seen for it alone: it stays while the product added becomes a package (`docs/product-flight.md`), and leaves
 * fading as the label comes back.
 */
const button = (
  label: string,
  maybeMessage: Opt.Option<Message>,
  shows: ButtonShows,
  kind: 'Filled' | 'Text',
  dispatch: Dispatch<Message>,
) => {
  const { on } = handlers(dispatch)
  return (
    <button
      props={{
        className: cn(
          'state-layer relative shrink-0 rounded-full px-6 text-label-large transition-colors',
          // Minimum heights: a label that wraps on a narrow screen with a large font grows the button.
          kind === 'Filled' ? 'min-h-14 bg-primary text-on-primary' : 'min-h-10 text-primary',
          shows !== 'Progress' && 'disabled:text-on-surface/38',
          shows !== 'Progress' && kind === 'Filled' && 'disabled:bg-on-surface/12',
        ),
        disabled: Opt.isNone(maybeMessage),
      }}
      on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
    >
      <span
        props={{
          className: shows === 'Label'
            ? 'opacity-100 transition-opacity duration-short-4 ease-standard-decelerate'
            : shows === 'Acknowledging'
            ? 'label-return opacity-100'
            : 'opacity-0 transition-none',
        }}
      >
        {label}
      </span>
      {shows !== 'Label'
        ? [
          <span
            key='progress'
            // The fade on removal only while the indicator is still shown (the step given back after a failure):
            // once `indicator-leave` holds it at opacity 0, a transition to 0 never ends, and snabbdom would keep
            // the element in the button.
            style={shows === 'Progress'
              ? {
                remove: {
                  opacity: '0',
                  transition: 'opacity var(--transition-duration-short-4) var(--ease-standard-accelerate)',
                },
              }
              : {}}
            props={{
              className: cn(
                'material-symbols-rounded pointer-events-none absolute inset-0 flex items-center justify-center',
                'text-[18px]',
                shows === 'Acknowledging' && 'indicator-leave',
              ),
              title: 'Adding the product',
            }}
          >
            <span props={{ className: 'animate-spin' }}>progress_activity</span>
          </span>,
        ]
        : []}
    </button>
  )
}

/** The field's supporting text. The line is there even when empty, so that a text appearing moves nothing. */
const supportingText = (supporting: Supporting) => (
  <div props={{ className: 'min-h-4 px-4 text-body-small text-on-surface-variant' }}>
    {Match.valueTags(supporting, {
      Nothing: () => [],
      CameraUnavailable: () => ['Camera not available. Type the name'],
      LookingUp: () => ['Looking up the product…'],
      // The attribution Open Food Facts' licence asks for, with the product's page.
      FromOpenFoodFacts: ({ url }) => [
        'From ',
        <a props={{ className: 'text-primary underline', href: url }}>Open Food Facts</a>,
      ],
      NotOnOpenFoodFacts: () => ['Not on Open Food Facts. Type the name'],
      LookupFailed: () => ['Couldn\'t reach Open Food Facts. Type the name'],
    })}
  </div>
)

/** Material's circular progress indicator, 24dp, where the field's trailing icon button goes. */
const progress = (
  <span
    props={{
      className: cn(
        'material-symbols-rounded pointer-events-none absolute top-1 right-1 flex h-12 w-12 items-center',
        'justify-center text-primary',
      ),
      title: 'Looking up the product',
    }}
  >
    <span props={{ className: 'animate-spin' }}>progress_activity</span>
  </span>
)

/**
 * Material's outlined text field of the name, drawn anew and focused whenever the program replaces the name, so
 * that the keyboard is up. While a product enters the fridge, its text comes back only once the letters have
 * gathered (`name-return`): they would otherwise gather over the same name, already there.
 */
const nameField = (shown: NameShown, activity: NameActivity, isReturning: boolean, dispatch: Dispatch<Message>) => {
  const { on, onValue } = handlers(dispatch)
  const maybeClearName = activity._tag === 'Editing' ? activity.controls.maybeClearName : Opt.none()
  return (
    <div key={`name-${shown.nameKey}`} props={{ className: 'flex flex-col gap-1' }}>
      <div props={{ className: 'relative' }}>
        <label props={{ className: 'block' }}>
          <input
            hook={{ create: initialValue(shown.name), insert: focusOnInsert }}
            attrs={{ 'data-flies-from': 'NameField' }}
            props={{
              type: 'text',
              enterKeyHint: 'next',
              disabled: activity._tag === 'Adding' || activity._tag === 'UnderDate' || activity._tag === 'LookingUp',
              placeholder: ' ',
              className: cn(
                'peer h-14 w-full rounded-extra-small border border-outline bg-transparent pl-4',
                'text-body-large text-on-surface caret-primary outline-none inset-ring-primary',
                'placeholder:text-transparent hover:border-on-surface focus:border-primary focus:inset-ring-1',
                'disabled:border-on-surface/12 disabled:text-on-surface/38',
                Opt.isSome(maybeClearName) || activity._tag === 'LookingUp' ? 'pr-13' : 'pr-4',
                isReturning && 'name-return',
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
          onNone: () => activity._tag === 'LookingUp' ? [progress] : [],
          onSome: (clear) => [
            <button
              attrs={{ 'aria-label': 'Clear name' }}
              props={{
                className: cn(
                  'state-layer material-symbols-rounded absolute top-1 right-1 flex h-12 w-12 items-center',
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
      {supportingText(shown.supporting)}
    </div>
  )
}

/** Material's FAB that opens the scanner: the step's secondary action, in the tertiary's color, under the thumb. */
const scanFab = (maybeScan: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <button
      attrs={{ 'aria-label': 'Scan barcode' }}
      props={{
        className: cn(
          'state-layer material-symbols-rounded absolute right-0 bottom-1 flex h-14 w-14 items-center',
          'justify-center rounded-large bg-tertiary-container text-on-tertiary-container shadow-elevation-3',
          'transition-colors disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none',
        ),
        title: 'Scan barcode',
        disabled: Opt.isNone(maybeScan),
      }}
      on={Opt.match(maybeScan, { onNone: () => ({}), onSome: (scan) => on('click', scan) })}
    >
      barcode_scanner
    </button>
  )
}

/**
 * The first step: the name under the app bar, the two ways out docked at the bottom, the fridge between. Hidden
 * once the scanner has risen over it, so that the camera, drawn behind the page, shows through the scanner's window.
 */
const nameStep = (
  shown: NameShown,
  activity: NameActivity,
  maybeEntering: Opt.Option<Entering>,
  dispatch: Dispatch<Message>,
) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  const maybeClose = activity._tag === 'Editing' || activity._tag === 'LookingUp'
    ? Opt.some(activity.controls.close)
    : Opt.none()
  return (
    <div
      key='naming'
      style={activity._tag === 'UnderScanner'
        ? { visibility: 'hidden', transition: 'visibility 0s linear var(--transition-duration-medium-4)' }
        : { visibility: 'visible', transition: 'none' }}
      props={{ className: 'absolute inset-0 flex flex-col bg-surface text-on-surface' }}
    >
      {appBar('Add products', 'close', 'Close', maybeClose, dispatch)}
      {/* Fits the reference screen; scrolls when the screen is shorter (the keyboard open, a large font). */}
      <div props={{ className: cn('flex flex-1 flex-col gap-3 overflow-y-auto pt-2', stepPadding) }}>
        {nameField(shown, activity, Opt.isSome(maybeEntering), dispatch)}
        {room(fridge(maybeEntering), scanFab(Opt.flatMap(controls, ({ maybeScan }) => maybeScan), dispatch))}
        {button(
          'Set expiration',
          Opt.flatMap(controls, ({ maybeRequestDate }) => maybeRequestDate),
          'Label',
          'Filled',
          dispatch,
        )}
        {activity._tag === 'LookingUp'
          ? button('Cancel', Opt.some(activity.controls.cancelLookup), 'Label', 'Text', dispatch)
          : button(
            'Add without date',
            Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd),
            activity._tag === 'Adding'
              ? 'Progress'
              : activity._tag === 'Editing' && activity.controls.acknowledging === 'Added'
              ? 'Acknowledging'
              : 'Label',
            'Text',
            dispatch,
          )}
      </div>
    </div>
  )
}

/** Material's segmented button of the orders. Its row stays empty until the order is known: nothing moves then. */
const orderSegments = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const segment = ({ order, choice }: OrderChoice) => {
    const maybePick = choice._tag === 'Offered' ? choice.maybePick : Opt.none()
    return (
      <button
        attrs={{ 'aria-pressed': choice._tag === 'Current' ? 'true' : 'false' }}
        props={{
          className: 'segment',
          disabled: activity._tag === 'Adding',
          title: orderTitles[order],
        }}
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
  return (
    <div props={{ className: 'flex h-10' }}>
      {Match.valueTags(shown.order, { Unknown: () => [], Known: ({ choices }) => choices.map(segment) })}
    </div>
  )
}

/**
 * Material's outlined text field of the date: read-only, typed into with the keypad, so that the thumb stays where
 * it is. The digits are shown as typed: grouping them would read them one way.
 */
const dateField = (shown: DateShown, activity: DateActivity) => {
  // Disabled while the product is being added; in the error's colors when the digits name no day.
  const look = activity._tag === 'Adding' ? 'Disabled' : shown.strip._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  // The margin above is the floating label's upper half, which Material's own field reserves.
  return (
    <div props={{ className: 'flex flex-col' }}>
      <label props={{ className: 'relative mt-2 block' }}>
        <input
          props={{
            type: 'text',
            readOnly: true,
            inputMode: 'none',
            disabled: look === 'Disabled',
            placeholder: shown.order._tag === 'Known' ? placeholders[shown.order.order] : ' ',
            value: shown.digits,
            className: cn(
              'peer h-14 w-full rounded-extra-small border bg-transparent px-4 text-body-large text-on-surface',
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
    </div>
  )
}

/** Material's filter chip of a day the digits name. */
const chip = ({ date, choice }: DateChoice, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeChoose = choice._tag === 'Offered' ? choice.maybeChoose : Opt.none()
  return (
    <button
      attrs={{ 'aria-pressed': choice._tag === 'Chosen' ? 'true' : 'false' }}
      props={{
        className: 'filter-chip',
        disabled: activity._tag === 'Adding',
      }}
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
 * Under the field, where a keyboard's suggestions would be: the hint, then the chips, on one line that scrolls
 * sideways. The hint stays laid out, unseen, under what replaces it, so that the strip keeps its height from the
 * first digit to the last: nothing under it moves while the user types, whatever the font's size.
 */
const strip = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => (
  <div
    props={{
      className: cn(
        'grid shrink-0 text-body-small',
        shown.strip._tag === 'NamingNothing' ? 'text-error' : 'text-on-surface-variant',
      ),
    }}
  >
    <span
      props={{ className: cn('col-start-1 row-start-1 px-4', shown.strip._tag !== 'Hint' && 'invisible') }}
    >
      {shown.order._tag === 'Known' ? hints[shown.order.order] : ''}
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
const keypad = (activity: DateActivity, dispatch: Dispatch<Message>) => {
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
 * The second step, over the first, laid out as a dialer: the fields read from the top, the keypad and the button
 * docked at the bottom. It comes and goes along Material's shared axis.
 */
const dateStep = (
  shown: DateShown,
  activity: DateActivity,
  dispatch: Dispatch<Message>,
) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  return (
    <div
      key='dating'
      style={{
        opacity: '0',
        transform: 'translateX(2rem)',
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--transition-duration-medium-4)',
        transitionTimingFunction: 'var(--ease-emphasized-decelerate)',
        delayed: { opacity: '1', transform: 'translateX(0)' },
        remove: {
          opacity: '0',
          transform: 'translateX(2rem)',
          pointerEvents: 'none',
          transitionDuration: 'var(--transition-duration-short-4)',
          transitionTimingFunction: 'var(--ease-emphasized-accelerate)',
        },
      }}
      props={{ className: 'absolute inset-0 flex flex-col bg-surface text-on-surface' }}
    >
      {appBar('Add products', 'arrow_back', 'Back', Opt.map(controls, ({ back }) => back), dispatch)}
      {/* Fits the reference screen; scrolls when the screen is shorter (the keyboard open, a large font). */}
      <div props={{ className: cn('flex flex-1 flex-col gap-2 overflow-y-auto', stepPadding) }}>
        <div props={{ className: 'flex flex-col px-4 pb-2' }}>
          <span props={{ className: 'text-label-medium text-on-surface-variant' }}>Product</span>
          <h3
            attrs={{ 'data-flies-from': 'DateHeading' }}
            props={{ className: 'line-clamp-2 wrap-anywhere text-title-large' }}
          >
            {shown.name}
          </h3>
        </div>
        {orderSegments(shown, activity, dispatch)}
        {dateField(shown, activity)}
        {strip(shown, activity, dispatch)}
        <div props={{ className: 'mt-auto rounded-extra-large bg-surface-container-low p-2' }}>
          {keypad(activity, dispatch)}
        </div>
        {button(
          'Add',
          Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd),
          activity._tag === 'Adding' ? 'Progress' : 'Label',
          'Filled',
          dispatch,
        )}
      </div>
    </div>
  )
}

/**
 * Material's full-screen dialog over the first step, with a transparent window over the camera, drawn behind the
 * page. It rises opaque; the surface's color fades from the window once it is in place.
 */
const scanner = (model: Model & { _tag: 'Scanning' }, dispatch: Dispatch<Message>) => (
  <div
    key='scanner'
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
    props={{ className: 'absolute inset-0 flex flex-col' }}
  >
    {appBar('Scan barcode', 'close', 'Close', Opt.some(model.closeScanner), dispatch)}
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        transition:
          'background-color var(--transition-duration-short-4) var(--ease-standard) var(--transition-duration-medium-4)',
        delayed: { backgroundColor: 'transparent' },
      }}
      props={{ className: 'flex flex-1 items-center justify-center px-4' }}
    >
      {model.camera === 'Available'
        ? <div props={{ className: 'h-44 w-72 max-w-full rounded-large border-2 border-inverse-on-surface' }} />
        : (
          <div props={{ className: 'flex flex-col items-center gap-2 px-4 text-center text-on-surface-variant' }}>
            <span props={{ className: 'material-symbols-rounded icon-large' }}>no_photography</span>
            <span props={{ className: 'text-body-medium' }}>Camera not available. Type the name</span>
          </div>
        )}
    </div>
    <div props={{ className: cn('bg-surface pt-4 text-center text-body-medium text-on-surface-variant', stepPadding) }}>
      {model.camera === 'Available' ? 'Point the camera at a barcode' : ''}
    </div>
  </div>
)

/**
 * A stylized fridge, there only while a product enters it (`docs/product-flight.md`). Keyed by the product, so
 * that the next one plays it anew over the one fading. Decoration: the announcement says what was added.
 */
const fridge = (maybeEntering: Opt.Option<Entering>) => (
  <div
    key='fridge'
    props={{ className: 'pointer-events-none absolute inset-x-0 top-0 bottom-16 grid place-items-center' }}
  >
    {Opt.match(maybeEntering, {
      onNone: () => [],
      onSome: ({ product }) => [
        <div
          key={`fridge-${DateTime.toEpochMillis(product.creationDate)}`}
          style={{
            remove: {
              opacity: '0',
              transition: 'opacity var(--transition-duration-short-4) var(--ease-standard-accelerate)',
            },
          }}
          attrs={{ 'aria-hidden': 'true' }}
          props={{ className: 'fridge-visit col-start-1 row-start-1 flex aspect-5/8 h-24 max-h-full flex-col' }}
        >
          <div
            props={{
              className: 'relative h-1/3 shrink-0 rounded-t-small border-[1.5px] border-primary bg-primary-container',
            }}
          >
            <span props={{ className: 'absolute top-2 left-2 h-4 w-1 rounded-full bg-on-primary-container' }} />
          </div>
          <div
            props={{
              className: cn(
                'relative -mt-[1.5px] flex-1 rounded-b-small border-[1.5px] border-primary',
                'bg-surface-container-highest perspective-near',
              ),
            }}
          >
            <div
              attrs={{ 'data-fridge': true }}
              props={{ className: 'absolute inset-0 flex items-center justify-center' }}
            >
              <span props={{ className: 'fridge-content material-symbols-rounded text-primary' }}>package_2</span>
            </div>
            <div
              props={{
                className: cn(
                  'fridge-door absolute -inset-[1.5px] rounded-b-small border-[1.5px] border-primary',
                  'bg-primary-container',
                ),
              }}
            >
              <span props={{ className: 'absolute top-3 left-2 h-6 w-1 rounded-full bg-on-primary-container' }} />
            </div>
          </div>
        </div>,
      ],
    })}
  </div>
)

/**
 * The name's letters, laid over where it is written, gathering into a package that flies into the fridge
 * (`docs/product-flight.md`). Keyed by the product: the next one's is a new element.
 */
const enteringProduct = ({ product, from }: Entering) => (
  <div
    key={`entering-${DateTime.toEpochMillis(product.creationDate)}`}
    hook={gatherAndFly(`[data-flies-from="${from}"]`, '[data-fridge]')}
    attrs={{ 'aria-hidden': 'true' }}
    props={{ className: 'absolute top-0 left-0' }}
  >
    <div
      attrs={{ 'data-letters': true, dir: 'auto' }}
      props={{ className: 'absolute flex items-center whitespace-pre text-on-surface' }}
    >
      {piecesOf(product.name).map((piece) => (
        <span attrs={{ 'data-letter': true }} props={{ className: 'gather-letter shrink-0' }}>{piece}</span>
      ))}
    </div>
    <div attrs={{ 'data-traveller': true }} props={{ className: 'traveller-x absolute h-6 w-6' }}>
      <div props={{ className: 'traveller-y' }}>
        <span props={{ className: 'pack-in material-symbols-rounded block text-primary' }}>package_2</span>
      </div>
    </div>
  </div>
)

/** Over both steps and under the scanner. It takes no input: the controls under it stay pressable. */
const flightLayer = (maybeEntering: Opt.Option<Entering>) => (
  <div key='flight' props={{ className: 'pointer-events-none absolute inset-0' }}>
    {Opt.match(maybeEntering, { onNone: () => [], onSome: (entering) => [enteringProduct(entering)] })}
  </div>
)

/**
 * What a screen reader hears once a product is added, the fridge and the flight being decoration. The live region
 * is always there: it is announced when its text changes.
 */
const announcement = (maybeEntering: Opt.Option<Entering>) => (
  <div key='announcement' attrs={{ 'aria-live': 'polite' }} props={{ className: 'sr-only' }}>
    {Opt.match(maybeEntering, {
      onNone: () => [],
      onSome: ({ product: { name, maybeExpirationDate } }) => [
        `${name} added. ${
          Opt.match(maybeExpirationDate, {
            onNone: () => 'No expiration',
            onSome: (date) =>
              `Expires ${formatDay(date)}`,
          })
        }`,
      ],
    })}
  </div>
)

const failureTexts: Readonly<Record<Failure, string>> = {
  AddFailed: 'Couldn\'t add the product',
  OrderNotKept: 'Couldn\'t save the date order',
}

/**
 * The heights of the controls docked at the bottom of each step, at their minimum, and the 16dp above them. On the
 * first step: its two buttons, the 12dp between them and above, and the scan FAB with its 4dp, which the snackbar
 * stands above, as Material's does; on the second, the "Add" button.
 */
const clearances = {
  Naming: '[--snackbar-clearance:12.25rem]',
  Dating: '[--snackbar-clearance:4.5rem]',
} as const

/**
 * Material's snackbar (`snackbar` in `styles.css`) 16dp above the controls docked at the bottom of the step shown,
 * keyed by its id so that the next one appears anew, after this one has sunk. The place stays, so that it enters
 * and leaves with its own transitions.
 */
const snackbar = (shown: Snackbar, step: keyof typeof clearances) => (
  <div key='snackbar' props={{ className: cn('snackbar-slot', clearances[step]) }}>
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
    key='AddProducts'
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
    props={{ className: 'fixed inset-0 z-70' }}
  >
    {[
      ...Match.valueTags(model, {
        Naming: (naming) => [
          nameStep(naming, { _tag: 'Editing', controls: naming }, naming.maybeEntering, dispatch),
          flightLayer(naming.maybeEntering),
          announcement(naming.maybeEntering),
        ],
        LookingUp: (lookingUp) => [
          nameStep(lookingUp, { _tag: 'LookingUp', controls: lookingUp }, Opt.none(), dispatch),
          flightLayer(Opt.none()),
          announcement(Opt.none()),
        ],
        Scanning: (scanning) => [
          nameStep(scanning, { _tag: 'UnderScanner' }, Opt.none(), dispatch),
          flightLayer(Opt.none()),
          scanner(scanning, dispatch),
          announcement(Opt.none()),
        ],
        Dating: (dating) => [
          nameStep(dating, { _tag: 'UnderDate' }, dating.maybeEntering, dispatch),
          dateStep(dating, { _tag: 'Editing', controls: dating }, dispatch),
          flightLayer(dating.maybeEntering),
          announcement(dating.maybeEntering),
        ],
        Adding: (adding) =>
          Match.valueTags(adding.step, {
            Naming: () => [
              nameStep(adding, { _tag: 'Adding' }, adding.maybeEntering, dispatch),
              flightLayer(adding.maybeEntering),
              announcement(adding.maybeEntering),
            ],
            Dating: (date) => [
              nameStep(adding, { _tag: 'UnderDate' }, adding.maybeEntering, dispatch),
              dateStep(date, { _tag: 'Adding' }, dispatch),
              flightLayer(adding.maybeEntering),
              announcement(adding.maybeEntering),
            ],
          }),
      }),
      snackbar(
        model.snackbar,
        model._tag === 'Dating' || (model._tag === 'Adding' && model.step._tag === 'Dating') ? 'Dating' : 'Naming',
      ),
    ]}
  </div>
)
