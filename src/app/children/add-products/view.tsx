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
  Message,
  Model,
  NameShown,
  OrderChoice,
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

/**
 * What the first step does: its controls take, it waits for the lookup, which only its cancel and close buttons
 * take, it is hidden under the scanner, it waits under the second step, or it is disabled while adding.
 */
type NameActivity = Readonly<
  | { _tag: 'Editing'; controls: Model & { _tag: 'Naming' } }
  | { _tag: 'LookingUp'; controls: Model & { _tag: 'LookingUp' } }
  | { _tag: 'UnderScanner' }
  | { _tag: 'UnderDate' }
  | { _tag: 'Adding' }
>

/** What the second step does: its controls take, or are disabled while adding. */
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
        className: 'flex h-16 shrink-0 items-center gap-1 bg-surface px-1 pt-sait pl-sail pr-sair text-on-surface',
      }}
    >
      <button
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

/**
 * The spare height between a step's fields and its controls, so that a step fits a short screen: what it holds
 * draws over what is above.
 */
const room = (...held: ReadonlyArray<VNode>) => <div props={{ className: 'relative flex-1' }}>{held}</div>

/**
 * What a step's button shows in place of its label: Material's circular indicator while its action is done, and
 * while the product it added leaves the step, after which the label comes back.
 */
type ButtonShows = 'Label' | 'Progress' | 'Acknowledging'

/**
 * Material's filled button, the one action of a step, where the thumb rests; and its text button, the other
 * way out of the first step. Both say what they do, and the one tapped shows, in its own colors, Material's
 * circular indicator in place of its label while its action is being done, and while the product it added
 * becomes a package: the write is mostly quicker than a frame, and the indicator would otherwise never be drawn.
 * The indicator appears at once, as the label leaves at once under it, and leaves fading as the label fades back
 * in, once the package has left; the model keeps the indicator for the whole flight, which the keyframes cut
 * short.
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
          kind === 'Filled' ? 'h-14 bg-primary text-on-primary' : 'h-10 text-primary',
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

/**
 * The text field's supporting text: where the name came from when a scan named it, or that it can only be typed.
 * The line is there even when empty, so that a text appearing moves nothing.
 */
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
 * Material's outlined text field of the name, with its trailing icon button, which clears it, shown while there
 * is one, or the progress of the lookup, while the field is disabled. Drawn anew (with the new name) and focused, so that the keyboard is up, when a scan or a clearing
 * replaces it and when a product was added. Its supporting text says where a scanned name came from, or when the
 * camera is not available, and the name can only be typed. Once the letters of the product just added have become
 * it, the name comes back in the field drawn anew, for the next product: after an add from the second step too,
 * whose heading's letters would otherwise gather over the same name, already back.
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

/**
 * Material's FAB that opens the scanner, at the bottom right, over the step's filled button, within the thumb's
 * reach: in the tertiary's color, as the step's secondary action beside the primary's. Disabled, flat, until
 * the device is known to read barcodes.
 */
const scanFab = (maybeScan: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <button
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
 * The first step, as a form read from the top: the name, under the app bar, and, docked at the bottom, within
 * the thumb's reach and above the keyboard that the name opens, the two ways out, going on to the date, or
 * adding the product as it is, with the scanner's FAB over them, and the fridge in the space between. Hidden once
 * the scanner has risen over it, so that the camera, drawn behind the page, shows through the scanner's window;
 * shown at once when the scanner sinks away.
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
      <div props={{ className: cn('flex flex-1 flex-col gap-3 pt-2', stepPadding) }}>
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

/**
 * Material's segmented button of the orders the digits can be read in, one segment each, the one in use
 * selected with its check; disabled while the product is being added. Its row stays empty until the order is
 * known, so that nothing moves when it is.
 */
const orderSegments = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const segment = ({ order, choice }: OrderChoice) => {
    const maybePick = choice._tag === 'Offered' ? choice.maybePick : Opt.none()
    return (
      <button
        props={{
          className: cn(
            'state-layer -ml-px flex h-10 flex-1 items-center justify-center gap-2 border text-label-large',
            'transition-colors first:ml-0 first:rounded-l-full last:rounded-r-full',
            'disabled:border-on-surface/12 disabled:text-on-surface/38',
            choice._tag === 'Current'
              ? 'z-10 border-outline bg-secondary-container text-on-secondary-container disabled:bg-on-surface/12'
              : 'border-outline text-on-surface',
          ),
          disabled: activity._tag === 'Adding',
          title: orderTitles[order],
        }}
        on={Opt.match(maybePick, { onNone: () => ({}), onSome: (pick) => on('click', pick) })}
      >
        {/* Keyed: the label must not take over the check's element, and its font, once the check goes. */}
        {choice._tag === 'Current'
          ? [<span key='check' props={{ className: 'material-symbols-rounded text-[18px]' }}>check</span>]
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
 * Material's outlined text field of the expiration date, typed into with the keypad rather than the keyboard,
 * which keeps the thumb where it is: a read-only input, whose text is the program's, the digits as typed, since
 * grouping them would read them one way. A tap focuses it, as a text field, and shows the hint, the order the
 * digits are read in; the label floats once there are digits. What it says is in the strip under it.
 */
const dateField = (shown: DateShown, activity: DateActivity) => {
  // Disabled while the product is being added; in the error's colors when the digits name no day.
  const look = activity._tag === 'Adding' ? 'Disabled' : shown.strip._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  return (
    <div props={{ className: 'flex flex-col' }}>
      <label props={{ className: 'relative block' }}>
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

/**
 * Material's filter chip with a leading icon, one per day the digits name: selected, its check in place of the
 * icon, once it is the product's; disabled while the product is being added. The icon and the outline,
 * transparent once selected, keep the chip's size, so that picking a day moves no chip.
 */
const chip = ({ date, choice }: DateChoice, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeChoose = choice._tag === 'Offered' ? choice.maybeChoose : Opt.none()
  return (
    <button
      props={{
        className: cn(
          'state-layer flex h-8 shrink-0 items-center gap-2 rounded-small border pr-4 pl-2 text-label-large',
          'whitespace-nowrap disabled:border-on-surface/12 disabled:text-on-surface/38',
          choice._tag === 'Chosen'
            ? 'border-transparent bg-secondary-container text-on-secondary-container disabled:bg-on-surface/12'
            : 'border-outline-variant text-on-surface-variant',
        ),
        disabled: activity._tag === 'Adding',
      }}
      on={Opt.match(maybeChoose, { onNone: () => ({}), onSome: (choose) => on('click', choose) })}
    >
      <span props={{ className: 'material-symbols-rounded text-[18px]' }}>
        {choice._tag === 'Chosen' ? 'check' : 'event'}
      </span>
      <span>{formatDay(date)}</span>
    </button>
  )
}

/**
 * The strip between the field and the keypad, as the keyboard's suggestions are: how to type a date in the order
 * in use, the chips of the days the digits name, or that they name none, in the error's colors. Two rows of
 * chips tall, whatever it shows, so that a change moves nothing: the digits name two days at most, which fit
 * one row, or one row each on the narrowest phone.
 */
const strip = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => (
  <div
    props={{
      className: cn(
        'flex h-18 shrink-0 flex-wrap content-start gap-2 text-body-small',
        shown.strip._tag === 'NamingNothing' ? 'text-error' : 'text-on-surface-variant',
      ),
    }}
  >
    {Match.valueTags(shown.strip, {
      Hint: () => [
        <span props={{ className: 'px-4' }}>{shown.order._tag === 'Known' ? hints[shown.order.order] : ''}</span>,
      ],
      Naming: ({ choices }) => choices.map((choice) => chip(choice, activity, dispatch)),
      NamingNothing: () => [<span props={{ className: 'px-4' }}>Not an upcoming date</span>],
    })}
  </div>
)

/**
 * A keypad of the app's own: always where the thumb expects it. Its keys are Material's tonal buttons, in the
 * pills of a button group, in the tone that stands out on the date's panel; the ones that erase a digit and
 * clear them all sit beside the zero.
 */
const keypad = (activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const key = (label: string, maybeMessage: Opt.Option<Message>, { title = label, isIcon = false } = {}) => (
    <button
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
 * The second step, over the first, laid out as a dialer: read from the top, the product's name under its label,
 * on two lines at most, the order the digits are read in, the date's field and the days it can name; docked at
 * the bottom, within the thumb's reach, as a keyboard would be, the keypad's panel and the button that adds the
 * product. It comes and goes along Material's shared axis.
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
      <div props={{ className: cn('flex flex-1 flex-col gap-3', stepPadding) }}>
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
        {room()}
        <div props={{ className: 'rounded-extra-large bg-surface-container-low p-4' }}>
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
 * The scanner, Material's full-screen dialog over the first step: a transparent window over the camera, which
 * the scanner draws behind the page. It rises opaque, the surface's color, which then fades from the window, and
 * sinks back with the step already shown through it.
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
 * A stylized fridge, in the primary's colors: the freezer's door on top, and the fridge's below it, hinged on the
 * right, with the inside behind it. It is there only while a product enters it, in the middle of the first step's
 * empty space, above the FAB, 96dp tall, smaller when the keyboard leaves less room: it appears
 * as the letters gather, its door opens, the product is put inside, the door closes over it, the fridge settles,
 * and it fades away. Keyed by the product, so that the next one plays it anew, over the one fading; the door turns
 * in the inside's perspective, out of the fridge. Decoration: the announcement says what was added.
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
 * The product added, entering the fridge: the letters of its name, laid over the name where it is written,
 * gather into a package, which flies into the fridge on an arc that two elements make, one moving across and the
 * other up or down. Keyed by the product: the next one's is a new element, and this one is dropped where it is.
 */
const enteringProduct = ({ product, from }: Entering) => (
  <div
    key={`entering-${DateTime.toEpochMillis(product.creationDate)}`}
    hook={{ insert: gatherAndFly(`[data-flies-from="${from}"]`, '[data-fridge]') }}
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

/**
 * The product entering the fridge, over both steps and under the scanner. It takes no input: the controls under it
 * stay pressable.
 */
const flightLayer = (maybeEntering: Opt.Option<Entering>) => (
  <div key='flight' props={{ className: 'pointer-events-none absolute inset-0' }}>
    {Opt.match(maybeEntering, { onNone: () => [], onSome: (entering) => [enteringProduct(entering)] })}
  </div>
)

/**
 * What a screen reader says once a product has been added, for which the fridge and the flight are decoration: its
 * name and when it expires, as the list says it. A live region is announced when its text changes, so it is always
 * there, empty while nothing is added.
 */
const announcement = (maybeEntering: Opt.Option<Entering>) => (
  <div key='announcement' attrs={{ 'aria-live': 'polite' }} props={{ className: 'sr-only' }}>
    {Opt.match(maybeEntering, {
      onNone: () => [],
      onSome: ({ product: { name, maybeExpirationDate } }) => [
        `${name} added. ${
          Opt.match(maybeExpirationDate, {
            onNone: () => 'No expiration',
            onSome: (date) => `Expires ${formatDay(date)}`,
          })
        }`,
      ],
    })}
  </div>
)

/**
 * Material's full-screen dialog, as a page, in two steps: the name, which the scanner can read from a barcode,
 * and then, over it, the expiration date, typed on the keypad. It rises over the page that opened it, and sinks
 * back, letting nothing through while it does.
 */
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
    {Match.valueTags(model, {
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
    })}
  </div>
)
