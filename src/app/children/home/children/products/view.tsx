import type { Dispatch } from '@fgaudo/effect-tea'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import { type Handlers, handlers } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { ItemSelection, Message, Model, ProductModel, ProductStatus } from './program.ts'

type Look = 'Plain' | 'Error'

/** The list item's leading avatar, which turns into a check once the item is selected, as Material's lists do. */
const avatar = (selection: ItemSelection, look: Look, content: ReadonlyArray<VNode>) =>
  selection.isSelected
    ? (
      <div
        key='selected'
        props={{
          className: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary',
        }}
      >
        <span props={{ className: 'material-symbols-rounded' }}>check</span>
      </div>
    )
    : (
      <div
        key='content'
        props={{
          className: cn(
            'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full leading-none',
            look === 'Error'
              ? 'bg-error-container text-on-error-container'
              : 'bg-primary-container text-on-primary-container',
          ),
        }}
      >
        {content}
      </div>
    )

/** The expiration day and month, or an infinity sign when the product does not expire. */
const expiration = (status: ProductStatus): ReadonlyArray<VNode> =>
  status._tag === 'Everlasting'
    ? [<span props={{ className: 'text-title-medium leading-none' }}>∞</span>]
    : [
      <span props={{ className: 'text-title-small leading-none font-bold' }}>
        {DateTime.getPartUtc(status.expirationDate, 'day')}
      </span>,
      <span props={{ className: 'text-label-small leading-none' }}>
        {DateTime.formatUtc(status.expirationDate, { month: 'short' })}
      </span>,
    ]

const supportingText = (status: ProductStatus) => {
  switch (status._tag) {
    case 'Everlasting':
      return 'No expiration'
    case 'Stale':
      return 'Expired'
    case 'ExpiringToday':
      return 'Expires today'
    case 'Fresh':
      return `${status.daysLeft} days left`
  }
}

/** Material's two-line list item, with a leading avatar; a long press (a right click on desktop) selects it. */
const item = (
  key: string,
  selection: ItemSelection,
  look: Look,
  leading: ReadonlyArray<VNode>,
  headline: string,
  supporting: string,
  { onPreventingDefault }: Handlers<Message>,
) => (
  <li
    key={key}
    props={{
      className: cn(
        'state-layer flex h-18 items-center gap-4 pl-4 pr-6 select-none [-webkit-touch-callout:none]',
        'transition-colors duration-200',
        selection.isSelected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface',
      ),
    }}
    on={onPreventingDefault('contextmenu', Opt.getOrUndefined(selection.maybeToggle))}
  >
    {avatar(selection, look, leading)}
    <div props={{ className: 'flex min-w-0 flex-col' }}>
      <span props={{ className: 'truncate text-body-large' }}>{headline}</span>
      <span props={{ className: cn('text-body-medium', look === 'Error' ? 'text-error' : 'text-on-surface-variant') }}>
        {supporting}
      </span>
    </div>
  </li>
)

const icon = (name: string) => [<span props={{ className: 'material-symbols-rounded' }}>{name}</span>]

/** Stored data that is not a product: it can still be selected and deleted, so that the list can be cleaned. */
const invalidItem = (product: Data.TaggedEnum.Value<ProductModel, 'Invalid'>, events: Handlers<Message>) =>
  item(
    product.id,
    product.selection,
    'Error',
    icon('error'),
    Opt.getOrElse(product.maybeName, () => 'Unnamed product'),
    'Not a valid product',
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
    'Error',
    icon('broken_image'),
    Opt.getOrElse(product.maybeName, () => 'Unnamed product'),
    'Cannot be read',
    events,
  )

const validItem = (product: Data.TaggedEnum.Value<ProductModel, 'Valid'>, events: Handlers<Message>) =>
  item(
    product.id,
    product.selection,
    product.status._tag === 'Stale' ? 'Error' : 'Plain',
    expiration(product.status),
    product.name,
    supportingText(product.status),
    events,
  )

const iconButton = (icon: string, label: string, message: Message | undefined, { on }: Handlers<Message>) => (
  <button
    props={{
      className:
        'state-layer material-symbols-rounded flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:opacity-38',
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
  if (model._tag !== 'Available' || model.deletion._tag === 'NothingSelected') {
    return undefined
  }
  const events = handlers(dispatch)
  const { deletion } = model
  return (
    <div props={{ className: 'flex h-16 items-center gap-1 px-1' }}>
      {iconButton(
        'close',
        'Clear the selection',
        deletion._tag === 'Possible' ? deletion.clearSelection : undefined,
        events,
      )}
      <div props={{ className: 'flex min-w-0 grow flex-col px-1' }}>
        <span props={{ className: 'truncate text-title-large-emphasized' }}>
          {deletion._tag === 'Possible' ? `${deletion.count} selected` : 'Deleting…'}
        </span>
        <span props={{ className: 'truncate text-label-medium' }}>{subtitleOf(model)}</span>
      </div>
      {iconButton(
        'delete',
        'Delete the selected products',
        deletion._tag === 'Possible' ? deletion.deleteSelected : undefined,
        events,
      )}
    </div>
  )
}

/** Material's empty state: what is missing, and what to do about it. */
const emptyState = (icon: string, title: string, text: string) => (
  <div props={{ className: 'flex flex-col items-center gap-2 px-8 pt-32 text-center' }}>
    <span props={{ className: 'material-symbols-rounded text-on-surface-variant text-display-medium!' }}>{icon}</span>
    <div props={{ className: 'text-title-medium text-on-surface' }}>{title}</div>
    <div props={{ className: 'text-body-medium text-on-surface-variant' }}>{text}</div>
  </div>
)

const subtitleOf = (model: Data.TaggedEnum.Value<Model, 'Available'>) => `${model.total} items`

/**
 * The top app bar's subtitle, how many products there are: in the bar, it stays in view while the list scrolls.
 * Nothing while there is no list.
 */
export const subtitle = (model: Model): string | undefined => model._tag === 'Available' ? subtitleOf(model) : undefined

export const list = (model: Model, dispatch: Dispatch<Message>) => {
  const events = handlers(dispatch)
  switch (model._tag) {
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
            {model.products.map((product, index) => {
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
