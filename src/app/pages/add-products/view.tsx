import type { Dispatch } from '@fgaudo/effect-tea'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import { handlers, initialValue, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { Digit, Message, Model } from './program.ts'

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

const formatDay = (date: DateTime.Utc) =>
  DateTime.formatUtc(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const keys: ReadonlyArray<Digit> = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** The top app bar of Material's full-screen dialog: its close button and its title. */
const appBar = (model: Model, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <div props={{ className: 'flex h-16 items-center gap-1 bg-surface px-1 pt-sait pl-sail pr-sair text-on-surface' }}>
      <button
        props={{
          className:
            'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full disabled:text-on-surface/38',
          title: 'Close',
          disabled: model._tag !== 'Editing',
        }}
        on={model._tag === 'Editing' ? on('click', model.close) : {}}
      >
        close
      </button>
      <h2 props={{ className: 'truncate px-1 text-title-large' }}>Add products</h2>
    </div>
  )
}

/**
 * Material's snackbar, at the bottom of the camera's window, where the eyes are while scanning: it says that the
 * product was added. Keyed by the product, so that the next one appears anew.
 */
const snackbar = (model: Model): ReadonlyArray<VNode> =>
  Opt.match(model.maybeJustAdded, {
    onNone: () => [],
    onSome: (product) => [
      <div
        key={`added-${DateTime.toEpochMillis(product.creationDate)}`}
        style={{
          opacity: '0',
          transform: 'translateY(0.5rem)',
          transition: 'opacity 150ms, transform 150ms',
          delayed: { opacity: '1', transform: 'translateY(0)' },
          remove: { opacity: '0' },
        }}
        props={{
          className:
            'absolute right-4 bottom-4 left-4 flex min-h-12 items-center gap-3 rounded-extra-small bg-inverse-surface px-4 py-3 text-body-medium text-inverse-on-surface shadow-elevation-3',
        }}
      >
        <span props={{ className: 'material-symbols-rounded text-inverse-primary' }}>check_circle</span>
        <span props={{ className: 'min-w-0 flex-1' }}>
          {Opt.match(product.maybeExpirationDate, {
            onNone: () => `Added ${product.name}, with no expiration`,
            onSome: (date) => `Added ${product.name}, expiring ${formatDay(date)}`,
          })}
        </span>
      </div>,
    ],
  })

/** A transparent window over the camera, which the scanner draws behind the page, or why there is none. */
const viewfinder = (model: Model) =>
  model.isCameraOn
    ? (
      <div props={{ className: 'relative flex flex-1 items-center justify-center' }}>
        <div props={{ className: 'h-32 w-64 rounded-large border-2 border-inverse-on-surface' }} />
        {snackbar(model)}
      </div>
    )
    : (
      <div
        props={{
          className:
            'relative flex flex-1 flex-col items-center justify-center gap-2 bg-surface-container px-6 text-center text-on-surface-variant',
        }}
      >
        <span props={{ className: 'material-symbols-rounded' }}>no_photography</span>
        <span props={{ className: 'text-body-medium' }}>The camera is not available: type the product's name.</span>
        {snackbar(model)}
      </div>
    )

/** Material's outlined text field, drawn anew (with the new name) when a scan replaces it. */
const nameField = (model: Model, dispatch: Dispatch<Message>) => {
  const { onValue } = handlers(dispatch)
  const isEditable = model._tag === 'Editing'
  return (
    <label key={`name-${model.nameKey}`} props={{ className: 'relative block' }}>
      <input
        hook={{ create: initialValue(model.name) }}
        props={{
          type: 'text',
          disabled: !isEditable,
          placeholder: ' ',
          className: cn(
            'peer h-14 w-full rounded-extra-small border border-outline bg-transparent px-4 text-body-large',
            'text-on-surface caret-primary outline-none inset-ring-primary placeholder:text-transparent',
            'hover:border-on-surface focus:border-primary focus:inset-ring-1',
            'disabled:border-on-surface/12 disabled:text-on-surface/38',
          ),
        }}
        on={model._tag === 'Editing' ? onValue('input', model.changeName, inputValue) : {}}
      />
      <span
        props={{
          className: cn(
            'pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-surface px-1 text-body-small',
            'text-on-surface-variant transition-all duration-150 peer-placeholder-shown:top-1/2',
            'peer-placeholder-shown:text-body-large peer-focus:top-0 peer-focus:text-body-small',
            'peer-focus:text-primary peer-disabled:text-on-surface/38',
          ),
        }}
      >
        Name
      </span>
    </label>
  )
}

/**
 * Material's outlined text field, typed into with the keypad: never focused, as the name's field may be, but its
 * label stays on the outline, over a hint, and its supporting text says how to type a date, or that the digits name
 * no day. The digits are shown as
 * typed: grouping them would read them one way, which the chips leave to the user.
 */
const dateField = (model: Model) => {
  const isEmpty = model.digits === ''
  const isWrong = model._tag === 'Editing' && !isEmpty && model.choices.length === 0
  const isEnabled = model._tag === 'Editing'
  return (
    <div props={{ className: 'flex flex-col gap-1' }}>
      <div
        props={{
          className: cn(
            'relative flex h-14 items-center rounded-extra-small border px-4 text-body-large',
            !isEnabled
              ? 'border-on-surface/12 text-on-surface/38'
              : isWrong
              ? 'border-error text-on-surface'
              : 'border-outline text-on-surface',
          ),
        }}
      >
        <span
          props={{
            className: cn(
              'absolute top-0 left-3 -translate-y-1/2 bg-surface px-1 text-body-small',
              !isEnabled ? 'text-on-surface/38' : isWrong ? 'text-error' : 'text-on-surface-variant',
            ),
          }}
        >
          Expiration date
        </span>
        {isEmpty
          ? <span props={{ className: 'text-on-surface-variant' }}>DDMMYY</span>
          : <span props={{ className: 'tracking-widest' }}>{model.digits}</span>}
      </div>
      <div props={{ className: cn('px-4 text-body-small', isWrong ? 'text-error' : 'text-on-surface-variant') }}>
        {isWrong ? 'No day ahead matches these digits' : 'Day, month and, if needed, the year: then pick the day'}
      </div>
    </div>
  )
}

/** Material's suggestion chip: tapping a day adds the product with it. */
const chip = (label: string, maybeMessage: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <button
      props={{
        className: cn(
          'state-layer h-8 shrink-0 rounded-small border px-4 text-label-large',
          Opt.isSome(maybeMessage)
            ? 'border-outline-variant text-on-surface-variant'
            : 'border-on-surface/12 text-on-surface/38',
        ),
        disabled: Opt.isNone(maybeMessage),
      }}
      on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
    >
      {label}
    </button>
  )
}

const choices = (model: Model, dispatch: Dispatch<Message>): ReadonlyArray<VNode> => {
  if (model._tag !== 'Editing') {
    return [<span props={{ className: 'text-body-medium text-on-surface-variant' }}>Adding…</span>]
  }
  return model.digits === ''
    ? [chip('No expiration', model.maybeAddUndated, dispatch)]
    : model.choices.map(({ date, maybeAdd }) => chip(formatDay(date), maybeAdd, dispatch))
}

/** A keypad of the app's own: always where the thumb expects it, and it never covers the camera. */
const keypad = (model: Model, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeType = model._tag === 'Editing' ? model.maybeTypeDigit : Opt.none<(digit: Digit) => Message>()
  const maybeErase = model._tag === 'Editing' ? model.maybeEraseDigit : Opt.none<Message>()
  const key = (label: string, maybeMessage: Opt.Option<Message>, isIcon = false) => (
    <button
      props={{
        className: cn(
          'state-layer flex h-14 items-center justify-center rounded-full text-headline-small text-on-surface',
          'disabled:text-on-surface/38',
          { 'material-symbols-rounded': isIcon },
        ),
        disabled: Opt.isNone(maybeMessage),
        title: isIcon ? 'Erase a digit' : label,
      }}
      on={Opt.match(maybeMessage, { onNone: () => ({}), onSome: (message) => on('click', message) })}
    >
      {label}
    </button>
  )
  const digitKey = (digit: Digit) => key(digit, Opt.map(maybeType, (type) => type(digit)))
  return (
    <div props={{ className: 'grid grid-cols-3 gap-1' }}>
      {keys.map(digitKey)}
      <div />
      {digitKey('0')}
      {key('backspace', maybeErase, true)}
    </div>
  )
}

/**
 * Material's full-screen dialog, as a page: the camera above, within sight, and below, within the thumb's reach,
 * the name, the date being typed, the days it can name and the keypad.
 */
export const view: View<Model, Message> = (model, dispatch) => (
  <div
    style={{
      transform: 'translateY(100%)',
      transition: 'transform 250ms cubic-bezier(0.05, 0.7, 0.1, 1)',
      delayed: { transform: 'translateY(0)' },
    }}
    props={{ className: 'fixed inset-0 flex flex-col' }}
  >
    {appBar(model, dispatch)}
    {viewfinder(model)}
    <div
      props={{
        className:
          'flex flex-col gap-3 bg-surface pt-4 pb-[calc(1rem+var(--spacing-saib))] pl-[calc(1.5rem+var(--spacing-sail))] pr-[calc(1.5rem+var(--spacing-sair))]',
      }}
    >
      {nameField(model, dispatch)}
      {dateField(model)}
      <div props={{ className: 'flex h-8 items-center gap-2 overflow-x-auto' }}>{choices(model, dispatch)}</div>
      {keypad(model, dispatch)}
    </div>
  </div>
)
