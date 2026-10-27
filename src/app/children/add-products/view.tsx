import type { Dispatch } from '@fgaudo/effect-tea'
import * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import type * as Product from '#domain/product.ts'
import { handlers, initialValue, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { DateChoice, Digit, Message, Model } from './program.ts'

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

// No weekday: a date read off a package has none, and two chips must fit a row of the narrowest phone.
const formatDay = (date: DateTime.Utc) => DateTime.formatUtc(date, { day: 'numeric', month: 'short', year: 'numeric' })

const keys: ReadonlyArray<Digit> = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** The top app bar of Material's full-screen dialog: its close button and its title. */
const appBar = (title: string, maybeClose: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
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
          title: 'Close',
          disabled: Opt.isNone(maybeClose),
        }}
        on={Opt.match(maybeClose, { onNone: () => ({}), onSome: (close) => on('click', close) })}
      >
        close
      </button>
      <h2 props={{ className: 'truncate px-1 text-title-large-emphasized' }}>{title}</h2>
    </div>
  )
}

/**
 * Material's snackbar, over the space above the keypad: it says that the product was added, with the action that
 * adds it again while it can be. Keyed by the product, so that the next one, a repeat included, appears anew.
 */
const snackbar = (product: Product.Product, maybeRepeat: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
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
          'absolute right-0 bottom-0 left-0 flex min-h-12 items-center gap-2 rounded-extra-small bg-inverse-surface',
          'py-1 pl-4 text-body-medium text-inverse-on-surface shadow-elevation-3',
          Opt.isSome(maybeRepeat) ? 'pr-2' : 'pr-4',
        ),
      }}
    >
      <span props={{ className: 'min-w-0 flex-1 py-2' }}>
        {Opt.match(product.maybeExpirationDate, {
          onNone: () => `Added ${product.name}, with no expiration`,
          onSome: (date) => `Added ${product.name}, expiring ${formatDay(date)}`,
        })}
      </span>
      {Opt.match(maybeRepeat, {
        onNone: () => [],
        onSome: (repeat) => [
          <button
            props={{ className: 'state-layer h-10 shrink-0 rounded-full px-3 text-label-large text-inverse-primary' }}
            on={on('click', repeat)}
          >
            Add another
          </button>,
        ],
      })}
    </div>
  )
}

const snackbarOf = (model: Model, dispatch: Dispatch<Message>): ReadonlyArray<VNode> =>
  Match.valueTags(model, {
    Editing: ({ maybeJustAdded }) =>
      Opt.match(maybeJustAdded, {
        onNone: () => [],
        onSome: ({ product, maybeRepeat }) => [snackbar(product, maybeRepeat, dispatch)],
      }),
    Scanning: () => [],
    Submitting: ({ maybeJustAdded }) =>
      Opt.match(maybeJustAdded, {
        onNone: () => [],
        onSome: (product) => [snackbar(product, Opt.none(), dispatch)],
      }),
  })

/**
 * Material's outlined text field with its trailing icon buttons: one clears the name, shown while there is one,
 * and one opens the scanner, disabled until the device is known to read barcodes. Drawn anew (with the new name)
 * when a scan or a clearing replaces it. Its supporting text says when the camera is not available.
 */
const nameField = (model: Model, dispatch: Dispatch<Message>) => {
  const { on, onValue } = handlers(dispatch)
  const maybeClearName = model._tag === 'Editing' ? model.maybeClearName : Opt.none()
  const maybeScan = model._tag === 'Editing' ? model.maybeScan : Opt.none()
  const iconButton = (icon: string, title: string, maybeMessage: Opt.Option<Message>) => (
    <button
      props={{
        className: cn(
          'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full',
          'text-on-surface-variant disabled:text-on-surface/38',
        ),
        title,
        disabled: Opt.isNone(maybeMessage),
      }}
      on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
    >
      {icon}
    </button>
  )
  return (
    <div key={`name-${model.nameKey}`} props={{ className: 'flex flex-col gap-1' }}>
      <div props={{ className: 'relative' }}>
        <label props={{ className: 'block' }}>
          <input
            hook={{ create: initialValue(model.name) }}
            props={{
              type: 'text',
              disabled: model._tag === 'Submitting',
              placeholder: ' ',
              className: cn(
                'peer h-14 w-full rounded-extra-small border border-outline bg-transparent pl-4',
                'text-body-large text-on-surface caret-primary outline-none inset-ring-primary',
                'placeholder:text-transparent hover:border-on-surface focus:border-primary focus:inset-ring-1',
                'disabled:border-on-surface/12 disabled:text-on-surface/38',
                Opt.isSome(maybeClearName) ? 'pr-25' : 'pr-13',
              ),
            }}
            on={model._tag === 'Editing' ? onValue('input', model.changeName, inputValue) : {}}
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
        <div props={{ className: 'absolute top-1 right-1 flex' }}>
          {Opt.match(maybeClearName, {
            onNone: () => [],
            onSome: (clear) => [iconButton('cancel', 'Clear the name', Opt.some(clear))],
          })}
          {iconButton('barcode_scanner', 'Scan a barcode', maybeScan)}
        </div>
      </div>
      {model.camera === 'Unavailable'
        ? [
          <div props={{ className: 'px-4 text-body-small text-on-surface-variant' }}>
            The camera is not available: type the product's name
          </div>,
        ]
        : []}
    </div>
  )
}

/**
 * Material's outlined text field of the expiration date, typed into with the keypad rather than the keyboard,
 * which keeps the thumb where it is: a read-only input, whose text is the program's, the digits as typed, since
 * grouping them would read them one way. A tap focuses it, as a text field, and shows the hint; the label floats
 * once there are digits. Its supporting text says how to type a date, the day the digits name once the form has
 * one, or that they name no day.
 */
const dateField = (model: Model) => {
  // Disabled while the product is being added; in the error's colors when the digits name no day.
  const look = model._tag === 'Submitting' ? 'Disabled' : model.support._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  return (
    <div props={{ className: 'flex flex-col gap-1' }}>
      <label props={{ className: 'relative block' }}>
        <input
          props={{
            type: 'text',
            readOnly: true,
            inputMode: 'none',
            disabled: look === 'Disabled',
            placeholder: 'DDMMYY',
            value: model.digits,
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
              'pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-surface px-1 text-body-small',
              'transition-all duration-short-3 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-body-large',
              'peer-focus:top-0 peer-focus:text-body-small peer-disabled:text-on-surface/38',
              look === 'Wrong' ? 'text-error' : 'text-on-surface-variant peer-focus:text-primary',
            ),
          }}
        >
          Expiration date
        </span>
      </label>
      {/* Two lines, whatever it says: the hint takes two on a phone, and a change of text moves nothing. */}
      <div
        props={{
          className: cn(
            'min-h-[2lh] px-4 text-body-small',
            look === 'Wrong' ? 'text-error' : 'text-on-surface-variant',
          ),
        }}
      >
        {Match.valueTags(model.support, {
          Hint: () => 'Day, month and, if needed, the year; nothing for no expiration',
          Named: ({ date }) => `Expires ${formatDay(date)}`,
          NamingNothing: () => 'No day ahead matches these digits',
        })}
      </div>
    </div>
  )
}

/**
 * Material's filter chip with a leading icon, one per day the digits name: selected, its check in place of the
 * icon, once it is the product's. The icon and the outline, transparent once selected, keep the chip's size, so
 * that picking a day moves no chip.
 */
const chip = ({ date, choice }: DateChoice, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <button
      props={{
        className: cn(
          'state-layer flex h-8 shrink-0 items-center gap-2 rounded-small border pr-4 pl-2 text-label-large',
          'whitespace-nowrap',
          choice._tag === 'Chosen'
            ? 'border-transparent bg-secondary-container text-on-secondary-container'
            : 'border-outline-variant text-on-surface-variant',
        ),
      }}
      on={choice._tag === 'Offered' ? on('click', choice.choose) : {}}
    >
      <span props={{ className: 'material-symbols-rounded text-[18px]' }}>
        {choice._tag === 'Chosen' ? 'check' : 'event'}
      </span>
      <span>{formatDay(date)}</span>
    </button>
  )
}

const choices = (model: Model, dispatch: Dispatch<Message>): ReadonlyArray<VNode> =>
  Match.valueTags(model, {
    Editing: ({ date }) =>
      Match.valueTags(date, {
        Undated: () => [],
        Naming: ({ choices }) => choices.map((choice) => chip(choice, dispatch)),
        NamingNothing: () => [],
      }),
    Scanning: () => [],
    Submitting: () => [<span props={{ className: 'text-body-medium text-on-surface-variant' }}>Adding…</span>],
  })

/**
 * A keypad of the app's own: always where the thumb expects it. Its keys are Material's tonal buttons, in the
 * pills of a button group; the one that adds the product sits where the thumb rests, next to the zero, in the
 * FAB's colors.
 */
const keypad = (model: Model, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const key = (
    label: string,
    maybeMessage: Opt.Option<Message>,
    { title = label, isIcon = false, colors = 'bg-surface-container text-on-surface' } = {},
  ) => (
    <button
      props={{
        className: cn(
          'state-layer flex h-14 items-center justify-center rounded-full text-headline-small transition-colors',
          'disabled:bg-on-surface/12 disabled:text-on-surface/38',
          colors,
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
  const digitKey = (digit: Digit) => key(digit, Opt.map(model.maybeTypeDigit, (type) => type(digit)))
  return (
    <div props={{ className: 'grid grid-cols-3 gap-2' }}>
      {keys.map(digitKey)}
      {key('check', model._tag === 'Editing' ? model.maybeAdd : Opt.none(), {
        title: 'Add the product',
        isIcon: true,
        colors: 'bg-primary-container text-on-primary-container',
      })}
      {digitKey('0')}
      {key('backspace', model.maybeEraseDigit, { title: 'Erase a digit', isIcon: true })}
    </div>
  )
}

/**
 * The page under the scanner: the name, the date being typed, the days it can name and the keypad, the snackbar
 * above it. Hidden once the scanner has risen over it, so that the camera, drawn behind the page, shows through
 * the scanner's window; shown at once when the scanner sinks away.
 */
const form = (model: Model, dispatch: Dispatch<Message>) => (
  <div
    style={model._tag === 'Scanning'
      ? { visibility: 'hidden', transition: 'visibility 0s linear var(--transition-duration-medium-4)' }
      : { visibility: 'visible', transition: 'none' }}
    props={{ className: 'absolute inset-0 flex flex-col bg-surface text-on-surface' }}
  >
    {appBar('Add products', model._tag === 'Editing' ? Opt.some(model.close) : Opt.none(), dispatch)}
    <div
      props={{
        className:
          'flex flex-1 flex-col gap-3 pt-2 pb-[calc(1rem+var(--spacing-saib))] pl-[calc(1.5rem+var(--spacing-sail))] pr-[calc(1.5rem+var(--spacing-sair))]',
      }}
    >
      {nameField(model, dispatch)}
      {dateField(model)}
      {
        /*
        Two rows, whatever the digits name, so that a change of chips moves nothing: the digits name two days at
        most, which fit one row, or one row each on the narrowest phone.
      */
      }
      <div props={{ className: 'flex h-18 shrink-0 flex-wrap content-start gap-2' }}>{choices(model, dispatch)}</div>
      {/* The snackbar's room: the spare height, so that the page fits a short screen; it then draws over the chips. */}
      <div props={{ className: 'relative flex-1' }}>{snackbarOf(model, dispatch)}</div>
      {keypad(model, dispatch)}
    </div>
  </div>
)

/**
 * The scanner, Material's full-screen dialog over the form: a transparent window over the camera, which the
 * scanner draws behind the page. It rises opaque, the surface's color, which then fades from the window, and
 * sinks back with the form already shown through it.
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
    {appBar('Scan a barcode', Opt.some(model.closeScanner), dispatch)}
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
            <span props={{ className: 'text-body-medium' }}>The camera is not available: type the product's name</span>
          </div>
        )}
    </div>
    <div
      props={{
        className:
          'bg-surface pt-4 pb-[calc(1rem+var(--spacing-saib))] pl-[calc(1.5rem+var(--spacing-sail))] pr-[calc(1.5rem+var(--spacing-sair))] text-center text-body-medium text-on-surface-variant',
      }}
    >
      {model.camera === 'Available' ? 'Point the camera at the product\'s barcode' : ''}
    </div>
  </div>
)

/**
 * Material's full-screen dialog, as a page: the name, which the scanner can read from a barcode, and within the
 * thumb's reach, the date being typed, the days it can name and the keypad. It rises over the page that opened
 * it, and sinks back, letting nothing through while it does.
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
    {form(model, dispatch)}
    {model._tag === 'Scanning' ? [scanner(model, dispatch)] : []}
  </div>
)
