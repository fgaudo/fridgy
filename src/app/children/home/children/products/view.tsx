import type { Dispatch } from '@fgaudo/effect-tea'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import type { VNode, VNodeStyle } from 'snabbdom'
import type * as UnitInterval from '#libs/numbers/unit-interval.ts'
import { type Handlers, handlers } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { ItemSelection, ListModel, Message, Model, ProductModel, ProductStatus } from './program.ts'

type Look = 'Plain' | 'Error'

/** A 40dp disc, the list item's leading avatar, in the colors of a role's container. */
const disc = (colors: string, content: ReadonlyArray<VNode>, style: VNodeStyle = {}) => (
  <div
    key='content'
    props={{
      className: cn(
        'relative flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full leading-none',
        colors,
      ),
    }}
    style={style}
  >
    {content}
  </div>
)

// Along the disc's edge: in its 40dp, a 4dp stroke around a radius of 18dp.
const RING_RADIUS = 18
const RING_LENGTH = 2 * Math.PI * RING_RADIUS
// Material's gap between the active indicator and the track, 4dp, past the round caps (half a stroke each).
const RING_GAP = 8

/**
 * Material's determinate circular progress indicator, around the disc, with how much of the product's life is
 * left: full when it is bought, and gone at the end of its expiration day. It starts at the top and, as the time
 * passes, shortens at the pace of a simple change; its color is the disc's stroke. The track, a gap after it,
 * shows the rest.
 */
const ring = (freshness: UnitInterval.UnitInterval) => {
  const activeLength = RING_LENGTH * freshness
  const trackLength = Math.max(0, RING_LENGTH - activeLength - 2 * RING_GAP)
  return (
    <svg attrs={{ class: 'absolute inset-0 fill-none stroke-4 [stroke-linecap:round]', viewBox: '0 0 40 40' }}>
      <title>{`${Math.round(freshness * 100)}% of its life left`}</title>
      <circle
        attrs={{
          class: 'stroke-secondary-container transition-[stroke-dasharray,stroke-dashoffset]',
          cx: 20,
          cy: 20,
          r: RING_RADIUS,
          transform: 'rotate(-90 20 20)',
        }}
        style={{
          strokeDasharray: `${trackLength} ${RING_LENGTH}`,
          strokeDashoffset: `${-(activeLength + RING_GAP)}`,
        }}
      />
      <circle
        attrs={{
          class: 'transition-[stroke-dashoffset]',
          cx: 20,
          cy: 20,
          r: RING_RADIUS,
          transform: 'rotate(-90 20 20)',
          'stroke-dasharray': RING_LENGTH,
        }}
        style={{ strokeDashoffset: `${RING_LENGTH - activeLength}` }}
      />
    </svg>
  )
}

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
 * The product's freshness, on the avatar of its expiration day: tonal, ringed by how much of its life is left, in
 * colors that go from the tertiary role's, with all of it, through the primary role's to the error role's
 * (`freshness-badge` in `styles.css`); filled with the error color once it has expired, with no life left to ring
 * it; an infinity sign when it never does.
 */
const freshnessBadge = (status: ProductStatus): VNode => {
  switch (status._tag) {
    case 'Everlasting':
      return disc('bg-secondary-container text-on-secondary-container', [
        <span props={{ className: 'text-title-medium leading-none' }}>∞</span>,
      ])
    case 'Stale':
    case 'ExpiredYesterday':
      return disc('bg-error text-on-error', expirationDay(status.expirationDate))
    case 'ExpiringToday':
    case 'ExpiringTomorrow':
    case 'Fresh':
      return disc(
        'freshness-badge',
        [...expirationDay(status.expirationDate), ring(status.freshness)],
        { '--freshness': `${status.freshness}` },
      )
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
          className: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary',
        }}
      >
        <span props={{ className: 'material-symbols-rounded icon-filled' }}>check</span>
      </div>
    )
    : badge

/** Material's two-line list item, with a leading avatar; a long press (a right click on desktop) selects it. */
const item = (
  key: string,
  selection: ItemSelection,
  badge: VNode,
  headline: string,
  supporting: string,
  look: Look,
  { onPreventingDefault }: Handlers<Message>,
) => (
  <li
    key={key}
    props={{
      className: cn(
        'state-layer flex h-18 items-center gap-4 pl-4 pr-6 select-none [-webkit-touch-callout:none]',
        'transition-colors',
        selection.isSelected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface',
      ),
    }}
    on={onPreventingDefault('contextmenu', Opt.getOrUndefined(selection.maybeToggle))}
  >
    {avatar(selection, badge)}
    <div props={{ className: 'flex min-w-0 flex-col' }}>
      <span props={{ className: 'truncate text-body-large' }}>{headline}</span>
      <span props={{ className: cn('text-body-medium', look === 'Error' ? 'text-error' : 'text-on-surface-variant') }}>
        {supporting}
      </span>
    </div>
  </li>
)

/** The avatar of stored data that is not a product: an icon, in the error's tonal colors. */
const errorBadge = (icon: string) =>
  disc('bg-error-container text-on-error-container', [
    <span props={{ className: 'material-symbols-rounded' }}>{icon}</span>,
  ])

/** Stored data that is not a product: it can still be selected and deleted, so that the list can be cleaned. */
const invalidItem = (product: Data.TaggedEnum.Value<ProductModel, 'Invalid'>, events: Handlers<Message>) =>
  item(
    product.id,
    product.selection,
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
    { isSelected: false, maybeToggle: Opt.none() },
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
    freshnessBadge(product.status),
    product.name,
    supportingText(product.status),
    product.status._tag === 'Stale' || product.status._tag === 'ExpiredYesterday' ? 'Error' : 'Plain',
    events,
  )

const iconButton = (icon: string, label: string, message: Message | undefined, { on }: Handlers<Message>) => (
  <button
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

/**
 * Material's contextual top app bar, which takes the place of the page's own while products are selected: how many,
 * out of how many, and what can be done with them. Nothing when none are.
 */
export const selectionBar = (model: Model, dispatch: Dispatch<Message>): VNode | undefined => {
  if (model.list._tag !== 'Available' || model.list.deletion._tag === 'NothingSelected') {
    return undefined
  }
  const events = handlers(dispatch)
  const { deletion } = model.list
  return (
    <div props={{ className: 'flex h-16 items-center gap-1 px-1' }}>
      {iconButton(
        'close',
        'Clear selection',
        deletion._tag === 'Possible' ? deletion.clearSelection : undefined,
        events,
      )}
      <div props={{ className: 'flex min-w-0 grow flex-col px-1' }}>
        <span props={{ className: 'truncate text-title-large-emphasized' }}>
          {deletion._tag === 'Possible' ? `${deletion.count} selected` : 'Deleting…'}
        </span>
        <span props={{ className: 'truncate text-label-medium' }}>{subtitleOf(model.list)}</span>
      </div>
      {iconButton(
        'delete',
        'Delete',
        deletion._tag === 'Possible' ? deletion.deleteSelected : undefined,
        events,
      )}
    </div>
  )
}

/**
 * Material's snackbar, once products have been deleted: how many, and the action that puts them back while they
 * can come back. It rises from where the parent places it, and sinks away.
 */
export const snackbar = (model: Model, dispatch: Dispatch<Message>): VNode | undefined => {
  if (model.lastDeletion._tag === 'None') {
    return undefined
  }
  const { on } = handlers(dispatch)
  const { count, maybeUndo } = model.lastDeletion
  return (
    <div
      key='snackbar'
      style={{
        opacity: '0',
        transform: 'translateY(0.5rem)',
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--transition-duration-short-3)',
        transitionTimingFunction: 'var(--ease-standard-decelerate)',
        delayed: { opacity: '1', transform: 'translateY(0)' },
        remove: {
          opacity: '0',
          transform: 'translateY(0.5rem)',
          transitionDuration: 'var(--transition-duration-short-2)',
          transitionTimingFunction: 'var(--ease-standard-accelerate)',
        },
      }}
      props={{
        className: cn(
          'pointer-events-auto flex min-h-12 items-center gap-2 rounded-extra-small bg-inverse-surface py-1 pl-4',
          'text-body-medium',
          'text-inverse-on-surface shadow-elevation-3',
          Opt.isSome(maybeUndo) ? 'pr-2' : 'pr-4',
        ),
      }}
    >
      <span props={{ className: 'min-w-0 flex-1 py-2' }}>
        {count === 1 ? 'Product deleted' : `${count} products deleted`}
      </span>
      {Opt.match(maybeUndo, {
        onNone: () => [],
        onSome: (undo) => [
          <button
            props={{
              className: 'state-layer h-10 shrink-0 rounded-full px-3 text-label-large text-inverse-primary',
            }}
            on={on('click', undo)}
          >
            Undo
          </button>,
        ],
      })}
    </div>
  )
}

/** Material's empty state: what is missing, and what to do about it. */
const emptyState = (icon: string, title: string, text: string) => (
  <div props={{ className: 'flex flex-col items-center gap-2 px-8 pt-32 text-center' }}>
    <span props={{ className: 'material-symbols-rounded icon-large text-on-surface-variant' }}>{icon}</span>
    <div props={{ className: 'text-title-medium text-on-surface' }}>{title}</div>
    <div props={{ className: 'text-body-medium text-on-surface-variant' }}>{text}</div>
  </div>
)

const subtitleOf = (list: Data.TaggedEnum.Value<ListModel, 'Available'>) => `${list.total} items`

/**
 * The top app bar's subtitle, how many products there are: in the bar, it stays in view while the list scrolls.
 * Nothing while there is no list.
 */
export const subtitle = (model: Model): string | undefined =>
  model.list._tag === 'Available' ? subtitleOf(model.list) : undefined

export const list = (model: Model, dispatch: Dispatch<Message>) => {
  const events = handlers(dispatch)
  switch (model.list._tag) {
    case 'Initial':
      return <div />
    case 'Error':
      return emptyState('error', 'Could not load the products', 'Try opening Fridgy again.')
    case 'Empty':
      return emptyState('kitchen', 'Nothing in the fridge', 'Add what you buy with the button below.')
    case 'Available':
      return (
        // Below the top app bar.
        <div props={{ className: 'pt-16 pb-24' }}>
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
