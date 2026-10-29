import type { Dispatch } from '@fgaudo/effect-tea'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import type { VNode, VNodeStyle } from 'snabbdom'
import { type Handlers, handlers } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { ItemSelection, ListModel, Message, Model, Presence, ProductModel, ProductStatus } from './program.ts'

type Look = 'Plain' | 'Error'

/**
 * The avatar's size: 40dp, or more when the user's font size makes the badge's two lines, the day and the month,
 * taller than the disc holds: the font size scales text and no length, and small text more than large.
 */
const avatarSize = cn(
  'aspect-square h-[max(2.5rem,calc((var(--text-title-small)+var(--text-label-small))*1.3))]',
  'shrink-0 rounded-full leading-none',
)

/** A disc, the list item's leading avatar, in the colors of a role's container. */
const disc = (colors: string, content: ReadonlyArray<VNode>, style: VNodeStyle = {}) => (
  <div
    key='content'
    style={style}
    props={{
      className: cn('flex flex-col items-center justify-center', avatarSize, colors),
    }}
  >
    {content}
  </div>
)

const NEUTRAL_DISC = 'bg-surface-container-highest text-on-surface'
const ERROR_DISC = 'bg-error-container text-on-error-container'
const FRESHNESS_DISC = 'freshness-disc freshness-text transition-colors'

/** The expiration day and month. */
const expirationDay = (expirationDate: DateTime.Utc): ReadonlyArray<VNode> => [
  <span props={{ className: 'text-title-small leading-none' }}>
    {DateTime.getPartUtc(expirationDate, 'day')}
  </span>,
  <span props={{ className: 'text-label-small leading-none' }}>
    {DateTime.formatUtc(expirationDate, { month: 'short' })}
  </span>,
]

/**
 * The expiration day on a disc colored by the life left, green through orange to red (`freshness-disc` in
 * `styles.css`); an infinity sign on a neutral disc when it never ends. An expired product is the red the scale
 * ends on, its life left being none.
 */
const freshnessBadge = (status: ProductStatus): VNode => {
  switch (status._tag) {
    case 'Everlasting':
      return disc(NEUTRAL_DISC, [<span props={{ className: 'text-title-medium leading-none' }}>∞</span>])
    case 'Stale':
    case 'ExpiredYesterday':
      return disc(FRESHNESS_DISC, expirationDay(status.expirationDate), { '--freshness': '0' })
    case 'ExpiringToday':
    case 'ExpiringTomorrow':
    case 'Fresh':
      return disc(FRESHNESS_DISC, expirationDay(status.expirationDate), { '--freshness': `${status.freshness}` })
  }
}

const supportingText = (status: ProductStatus) => {
  switch (status._tag) {
    case 'Everlasting':
      return 'No expiration'
    case 'Stale':
      return `Expired ${status.daysAgo} days ago`
    case 'ExpiredYesterday':
      return 'Expired yesterday'
    case 'ExpiringToday':
      return 'Expires today'
    case 'ExpiringTomorrow':
      return 'Expires tomorrow'
    case 'Fresh':
      return `Expires in ${status.inDays} days`
  }
}

/** The list item's leading avatar, which turns into a check once the item is selected, as Material's lists do. */
const avatar = (selection: ItemSelection, badge: VNode) =>
  selection.isSelected
    ? (
      <div
        key='selected'
        props={{
          className: cn('flex items-center justify-center bg-primary text-on-primary', avatarSize),
        }}
      >
        <span props={{ className: 'material-symbols-rounded icon-filled' }}>check</span>
      </div>
    )
    : badge

/**
 * Material's motion for a list: an arriving row opens its place as it fades in, a leaving one fades as it closes
 * it. The model keeps a leaving row where it was until then, so that snabbdom never moves the rows around it. The
 * place is the row's one grid track, from `0fr` to `1fr`: a row's height follows its text, which a large font
 * wraps, and a transition cannot reach an `auto` height.
 */
const rowMotion = (presence: Presence): VNodeStyle => {
  switch (presence) {
    case 'Arriving':
      return {
        gridTemplateRows: '0fr',
        opacity: '0',
        transitionProperty: 'grid-template-rows, opacity',
        transitionDuration: 'var(--transition-duration-medium-4)',
        transitionTimingFunction: 'var(--ease-emphasized-decelerate)',
        delayed: { gridTemplateRows: '', opacity: '1' },
      }
    case 'Listed':
      return {}
    case 'Leaving':
      // Not the arriving row's '0fr': snabbdom writes only a value that differs from the last frame's, and a row
      // still arriving holds its delayed values, written after it.
      return {
        gridTemplateRows: '0.0fr',
        opacity: '0.0',
        pointerEvents: 'none',
        transitionProperty: 'grid-template-rows, opacity',
        transitionDuration: 'var(--transition-duration-short-4)',
        transitionTimingFunction: 'var(--ease-emphasized-accelerate)',
      }
  }
}

/**
 * Material's two-line list item, with a leading avatar: 72dp at least, taller when a large font wraps the supporting
 * text. A long press (a right click on desktop) selects it; a tap does what the model says.
 */
const item = (
  key: string,
  selection: ItemSelection,
  presence: Presence,
  badge: VNode,
  headline: string,
  supporting: string,
  look: Look,
  { on, onPreventingDefault }: Handlers<Message>,
) => (
  <li
    key={key}
    props={{
      className: cn(
        'state-layer grid grid-rows-[1fr] select-none [-webkit-touch-callout:none] transition-colors',
        selection.isSelected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface',
      ),
    }}
    style={rowMotion(presence)}
    on={{
      ...onPreventingDefault('contextmenu', Opt.getOrUndefined(selection.maybeToggle)),
      ...Opt.match(selection.maybeTap, { onNone: () => ({}), onSome: (tap) => on('click', tap) }),
    }}
  >
    <div props={{ className: 'min-h-0 overflow-hidden' }}>
      <div props={{ className: 'flex min-h-18 items-center gap-4 py-2 pl-4 pr-6' }}>
        {avatar(selection, badge)}
        <div props={{ className: 'flex min-w-0 flex-col' }}>
          <span props={{ className: 'truncate text-body-large' }}>{headline}</span>
          <span
            props={{ className: cn('text-body-medium', look === 'Error' ? 'text-error' : 'text-on-surface-variant') }}
          >
            {supporting}
          </span>
        </div>
      </div>
    </div>
  </li>
)

/** The avatar of stored data that is not a product: an icon, in the error's tonal colors. */
const errorBadge = (icon: string) =>
  disc(ERROR_DISC, [<span props={{ className: 'material-symbols-rounded' }}>{icon}</span>])

/** Stored data that is not a product: it can still be selected and deleted, so that the list can be cleaned. */
const invalidItem = (product: Data.TaggedEnum.Value<ProductModel, 'Invalid'>, events: Handlers<Message>) =>
  item(
    product.id,
    product.selection,
    product.presence,
    errorBadge('error'),
    Opt.getOrElse(product.maybeName, () => 'Unnamed product'),
    'Not a valid product',
    'Error',
    events,
  )

/** Stored data that cannot even be referenced: nothing can be done with it. */
const corruptItem = (
  product: Data.TaggedEnum.Value<ProductModel, 'Corrupt'>,
  index: number,
  events: Handlers<Message>,
) =>
  item(
    `corrupt-${index}`,
    { isSelected: false, maybeToggle: Opt.none(), maybeTap: Opt.none() },
    'Listed',
    errorBadge('broken_image'),
    Opt.getOrElse(product.maybeName, () => 'Unnamed product'),
    'Cannot be read',
    'Error',
    events,
  )

const validItem = (product: Data.TaggedEnum.Value<ProductModel, 'Valid'>, events: Handlers<Message>) =>
  item(
    product.id,
    product.selection,
    product.presence,
    freshnessBadge(product.status),
    product.name,
    supportingText(product.status),
    product.status._tag === 'Stale' || product.status._tag === 'ExpiredYesterday' ? 'Error' : 'Plain',
    events,
  )

const iconButton = (icon: string, label: string, message: Message | undefined, { on }: Handlers<Message>) => (
  <button
    attrs={{ 'aria-label': label }}
    props={{
      className:
        'state-layer material-symbols-rounded flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:text-on-surface/38',
      title: label,
      disabled: message === undefined,
    }}
    on={message === undefined ? {} : on('click', message)}
  >
    {icon}
  </button>
)

/** The pieces of the contextual top app bar: its leading and trailing icon buttons, and its title. */
export type SelectionBar = Readonly<{ leading: VNode; title: string; trailing: VNode }>

/** Material's contextual top app bar, as pieces Home draws in its bar's shape. Nothing while no product is selected. */
export const selectionBar = (model: Model, dispatch: Dispatch<Message>): SelectionBar | undefined => {
  if (model.list._tag !== 'Available' || model.list.deletion._tag === 'NothingSelected') {
    return undefined
  }
  const events = handlers(dispatch)
  const { deletion } = model.list
  return {
    leading: iconButton(
      'close',
      'Clear selection',
      deletion._tag === 'Possible' ? deletion.clearSelection : undefined,
      events,
    ),
    title: deletion._tag === 'Possible' ? `${deletion.count} selected` : 'Deleting…',
    trailing: iconButton(
      'delete',
      'Delete',
      deletion._tag === 'Possible' ? deletion.deleteSelected : undefined,
      events,
    ),
  }
}

type Notice = Data.TaggedEnum.Value<Model['snackbar'], 'Shown'>['notice']

const noticeText = (notice: Notice) => {
  switch (notice._tag) {
    case 'Deleted':
      return notice.count === 1 ? 'Product deleted' : `${notice.count} products deleted`
    case 'DeleteFailed':
      return 'Couldn\'t delete the products'
    case 'RestoreFailed':
      return 'Couldn\'t put the products back'
  }
}

/**
 * Material's snackbar (`snackbar` in `styles.css`), keyed by what it tells so that the next one appears anew. One
 * that comes after another waits for the other to sink: both in the same place at once, one fading into the other,
 * would look like nothing happened.
 */
export const snackbar = (model: Model, dispatch: Dispatch<Message>): VNode | undefined => {
  if (model.snackbar._tag === 'None') {
    return undefined
  }
  const { on } = handlers(dispatch)
  const { at, entrance, notice } = model.snackbar
  return (
    <div
      key={`${notice._tag}-${DateTime.toEpochMillis(at)}`}
      attrs={{ 'data-entrance': entrance }}
      style={{ remove: { opacity: '0', transform: 'translateY(0.5rem)' } }}
      props={{ className: 'snackbar' }}
    >
      <span>{noticeText(notice)}</span>
      {notice._tag === 'Deleted'
        ? Opt.match(notice.maybeUndo, {
          onNone: () => [],
          onSome: (undo) => [<button on={on('click', undo)}>Undo</button>],
        })
        : []}
    </div>
  )
}

/**
 * What the list's place shows leaves fading, out of the flow, over what takes its place: the list over the empty
 * state, and the empty state over the rows put back.
 */
const leaving: VNodeStyle = {
  remove: {
    position: 'absolute',
    top: '0',
    right: '0',
    left: '0',
    opacity: '0',
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: 'var(--transition-duration-short-4)',
    transitionTimingFunction: 'var(--ease-emphasized-accelerate)',
  },
}

/** Material's empty state: what is missing, as an icon on a disc in a role's container colors, and what to do about it. */
const emptyState = (key: string, colors: string, icon: string, title: string, text: string) => (
  <div key={key} style={leaving} props={{ className: 'flex flex-col items-center gap-2 px-8 pt-44 text-center' }}>
    <div props={{ className: cn('mb-2 flex h-24 w-24 items-center justify-center rounded-full', colors) }}>
      <span props={{ className: 'material-symbols-rounded icon-large' }}>{icon}</span>
    </div>
    <div props={{ className: 'text-headline-small text-on-surface' }}>{title}</div>
    <div props={{ className: 'text-body-large text-on-surface-variant' }}>{text}</div>
  </div>
)

const subtitleOf = (list: Data.TaggedEnum.Value<ListModel, 'Available'>) => `${list.total} items`

/** The top app bar's subtitle, in the bar so that it stays in view while the list scrolls. Nothing without a list. */
export const subtitle = (model: Model): string | undefined =>
  model.list._tag === 'Available' ? subtitleOf(model.list) : undefined

const content = (model: Model, dispatch: Dispatch<Message>) => {
  const events = handlers(dispatch)
  switch (model.list._tag) {
    case 'Initial':
      return <div key='initial' />
    case 'Error':
      return emptyState(
        'error',
        'bg-error-container text-on-error-container',
        'error',
        'Could not load the products',
        'Try opening Fridgy again.',
      )
    case 'Empty':
      return emptyState(
        'empty',
        'bg-primary-container text-on-primary-container',
        'kitchen',
        'Nothing in the fridge',
        'Add what you buy with the button below.',
      )
    case 'Available':
      return (
        // Below the top app bar, at its full height.
        <div key='list' style={leaving} props={{ className: 'pt-medium-bar pb-24' }}>
          <ul>
            {model.list.products.map((product, index) => {
              switch (product._tag) {
                case 'Valid':
                  return validItem(product, events)
                case 'Invalid':
                  return invalidItem(product, events)
                case 'Corrupt':
                  return corruptItem(product, index, events)
              }
            })}
          </ul>
        </div>
      )
  }
}

/** The list, or why there is none, in a place that stays while they replace each other. */
export const list = (model: Model, dispatch: Dispatch<Message>) => (
  <div props={{ className: 'relative' }}>{[content(model, dispatch)]}</div>
)
