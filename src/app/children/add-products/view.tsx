import type { Dispatch } from '@fgaudo/effect-tea'
import * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import type * as Product from '#domain/product.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import { focusOnInsert, handlers, initialValue, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { DateChoice, DateShown, Digit, JustAdded, Message, Model, NameShown, OrderChoice } from './program.ts'

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
 * What the first step does: its controls take, it is hidden under the scanner, it waits under the second step,
 * or it is disabled while adding.
 */
type NameActivity = Readonly<
  | { _tag: 'Editing'; controls: Model & { _tag: 'Naming' } }
  | { _tag: 'UnderScanner' }
  | { _tag: 'UnderDate' }
  | { _tag: 'Adding' }
>

/** What the second step does: its controls take, or are disabled while adding. */
type DateActivity = Readonly<{ _tag: 'Editing'; controls: Model & { _tag: 'Dating' } } | { _tag: 'Adding' }>

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

/** What the snackbar's room holds besides it, which the snackbar stays above, as Material says it must a FAB. */
type Above = 'Nothing' | 'Fab'

/**
 * Material's snackbar, in the room above a step's controls, and above its FAB: its two lines say that the product
 * was added, its name cut to the line, and when it expires, as the list says it, with the action that adds it
 * again while it can be, and while the step's own button would not. Keyed by the product, so that the next one, a
 * repeat included, appears anew.
 */
const snackbar = ({ product, maybeRepeat }: JustAdded, above: Above, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <div
      key={`added-${DateTime.toEpochMillis(product.creationDate)}`}
      style={{
        opacity: '0',
        transform: 'translateY(0.5rem)',
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--transition-duration-short-3)',
        transitionTimingFunction: 'var(--ease-standard-decelerate)',
        delayed: { opacity: '1', transform: 'translateY(0)' },
        remove: {
          opacity: '0',
          transitionDuration: 'var(--transition-duration-short-2)',
          transitionTimingFunction: 'var(--ease-standard-accelerate)',
        },
      }}
      props={{
        className: cn(
          'absolute right-0 left-0 flex min-h-12 items-center gap-2 rounded-extra-small bg-inverse-surface',
          'py-1 pl-4 text-body-medium text-inverse-on-surface shadow-elevation-3',
          Opt.isSome(maybeRepeat) ? 'pr-2' : 'pr-4',
          above === 'Fab' ? 'bottom-21' : 'bottom-2',
        ),
      }}
    >
      <div props={{ className: 'flex min-w-0 flex-1 flex-col py-2' }}>
        <span props={{ className: 'flex' }}>
          <span props={{ className: 'min-w-0 truncate' }}>{product.name}</span>
          <span props={{ className: 'shrink-0' }}>{' added'}</span>
        </span>
        <span>
          {Opt.match(product.maybeExpirationDate, {
            onNone: () => 'No expiration',
            onSome: (date) => `Expires ${formatDay(date)}`,
          })}
        </span>
      </div>
      {Opt.match(maybeRepeat, {
        onNone: () => [],
        onSome: (repeat) => [
          <button
            props={{ className: 'state-layer h-10 shrink-0 rounded-full px-3 text-label-large text-inverse-primary' }}
            on={on('click', repeat)}
          >
            Add again
          </button>,
        ],
      })}
    </div>
  )
}

/**
 * The snackbar's room, and the FAB's: the spare height, so that a step fits a short screen; they then draw over
 * what is above.
 */
const room = (
  maybeJustAdded: Opt.Option<JustAdded>,
  dispatch: Dispatch<Message>,
  above: Above,
  ...held: ReadonlyArray<VNode>
) => (
  <div props={{ className: 'relative flex-1' }}>
    {Opt.match(maybeJustAdded, { onNone: () => [], onSome: (justAdded) => [snackbar(justAdded, above, dispatch)] })}
    {held}
  </div>
)

/** The snackbar of a product being added: the one added before, with no action. */
const noRepeat = (maybeJustAdded: Opt.Option<Product.Product>) =>
  Opt.map(maybeJustAdded, (product): JustAdded => ({ product, maybeRepeat: Opt.none() }))

/**
 * Material's filled button, the one action of a step, where the thumb rests; and its text button, the other
 * way out of the first step. Both say what they do, and the one tapped says that it is being done.
 */
const button = (
  label: string,
  maybeMessage: Opt.Option<Message>,
  kind: 'Filled' | 'Text',
  dispatch: Dispatch<Message>,
) => {
  const { on } = handlers(dispatch)
  return (
    <button
      props={{
        className: cn(
          'state-layer shrink-0 rounded-full px-6 text-label-large transition-colors',
          kind === 'Filled'
            ? 'h-14 bg-primary text-on-primary disabled:bg-on-surface/12 disabled:text-on-surface/38'
            : 'h-10 text-primary disabled:text-on-surface/38',
        ),
        disabled: Opt.isNone(maybeMessage),
      }}
      on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
    >
      {label}
    </button>
  )
}

/**
 * Material's outlined text field of the name, with its trailing icon button, which clears it, shown while there
 * is one. Drawn anew (with the new name) and focused, so that the keyboard is up, when a scan or a clearing
 * replaces it and when a product was added. Its supporting text says when the camera is not available, and the
 * name can only be typed.
 */
const nameField = (shown: NameShown, activity: NameActivity, dispatch: Dispatch<Message>) => {
  const { on, onValue } = handlers(dispatch)
  const maybeClearName = activity._tag === 'Editing' ? activity.controls.maybeClearName : Opt.none()
  return (
    <div key={`name-${shown.nameKey}`} props={{ className: 'flex flex-col gap-1' }}>
      <div props={{ className: 'relative' }}>
        <label props={{ className: 'block' }}>
          <input
            hook={{ create: initialValue(shown.name), insert: focusOnInsert }}
            props={{
              type: 'text',
              enterKeyHint: 'next',
              disabled: activity._tag === 'Adding' || activity._tag === 'UnderDate',
              placeholder: ' ',
              className: cn(
                'peer h-14 w-full rounded-extra-small border border-outline bg-transparent pl-4',
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
      {shown.camera === 'Unavailable'
        ? [
          <div props={{ className: 'px-4 text-body-small text-on-surface-variant' }}>
            Camera not available. Type the name
          </div>,
        ]
        : []}
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
 * adding the product as it is, with the scanner's FAB over them. Hidden once the scanner has risen over it, so
 * that the camera, drawn behind the page, shows through the scanner's window; shown at once when the scanner
 * sinks away.
 */
const nameStep = (
  shown: NameShown,
  activity: NameActivity,
  maybeJustAdded: Opt.Option<JustAdded>,
  dispatch: Dispatch<Message>,
) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  return (
    <div
      key='naming'
      style={activity._tag === 'UnderScanner'
        ? { visibility: 'hidden', transition: 'visibility 0s linear var(--transition-duration-medium-4)' }
        : { visibility: 'visible', transition: 'none' }}
      props={{ className: 'absolute inset-0 flex flex-col bg-surface text-on-surface' }}
    >
      {appBar('Add products', 'close', 'Close', Opt.map(controls, ({ close }) => close), dispatch)}
      <div props={{ className: cn('flex flex-1 flex-col gap-3 pt-2', stepPadding) }}>
        {nameField(shown, activity, dispatch)}
        {room(maybeJustAdded, dispatch, 'Fab', scanFab(Opt.flatMap(controls, ({ maybeScan }) => maybeScan), dispatch))}
        {button(
          'Set expiration',
          Opt.flatMap(controls, ({ maybeRequestDate }) => maybeRequestDate),
          'Filled',
          dispatch,
        )}
        {button(
          activity._tag === 'Adding' ? 'Adding…' : 'Add without date',
          Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd),
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
  maybeJustAdded: Opt.Option<JustAdded>,
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
          <h3 props={{ className: 'line-clamp-2 wrap-anywhere text-title-large' }}>{shown.name}</h3>
        </div>
        {orderSegments(shown, activity, dispatch)}
        {dateField(shown, activity)}
        {strip(shown, activity, dispatch)}
        {room(maybeJustAdded, dispatch, 'Nothing')}
        <div props={{ className: 'rounded-extra-large bg-surface-container-low p-4' }}>
          {keypad(activity, dispatch)}
        </div>
        {button(
          activity._tag === 'Adding' ? 'Adding…' : 'Add',
          Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd),
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
      Naming: (naming) => [nameStep(naming, { _tag: 'Editing', controls: naming }, naming.maybeJustAdded, dispatch)],
      Scanning: (scanning) => [
        nameStep(scanning, { _tag: 'UnderScanner' }, Opt.none(), dispatch),
        scanner(scanning, dispatch),
      ],
      Dating: (dating) => [
        nameStep(dating, { _tag: 'UnderDate' }, Opt.none(), dispatch),
        dateStep(dating, { _tag: 'Editing', controls: dating }, dating.maybeJustAdded, dispatch),
      ],
      Adding: (adding) =>
        Match.valueTags(adding.step, {
          Naming: () => [nameStep(adding, { _tag: 'Adding' }, noRepeat(adding.maybeJustAdded), dispatch)],
          Dating: (date) => [
            nameStep(adding, { _tag: 'UnderDate' }, Opt.none(), dispatch),
            dateStep(date, { _tag: 'Adding' }, noRepeat(adding.maybeJustAdded), dispatch),
          ],
        }),
    })}
  </div>
)
