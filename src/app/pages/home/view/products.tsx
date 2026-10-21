import type { Dispatch } from '@fgaudo/effect-tea'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import { type Handlers, handlers } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { ItemSelection, Message, Model, ProductModel } from '../parts/products.ts'

type ValidProduct = Data.TaggedEnum.Value<ProductModel, 'Valid'>

/** The badge: the expiration day and month, or an infinity sign when the product does not expire. */
const expirationBadge = (status: ValidProduct['status']) => (
  <div
    props={{
      className:
        'z-20 ml-2 w-12 h-12 rounded-full leading-0 shadow-gray-300 relative shadow-sm bg-secondary flex items-center gap-1 justify-evenly flex-col',
    }}
  >
    {status._tag === 'Everlasting'
      ? <div props={{ className: 'text-white leading-0 font-bold text-lg' }}>∞</div>
      : [
        <div props={{ className: 'text-white leading-0 font-bold text-lg' }}>
          {DateTime.getPartUtc(status.expirationDate, 'day')}
        </div>,
        <div props={{ className: 'text-white leading-0 text-sm' }}>
          {DateTime.formatUtc(status.expirationDate, { month: 'short' })}
        </div>,
      ]}
  </div>
)

const statusText = (status: ValidProduct['status']) => {
  switch (status._tag) {
    case 'Everlasting':
      return <div props={{ className: 'text-xs px-2' }}>No expiration</div>
    case 'Stale':
      return <div props={{ className: 'text-xs text-red-400 font-bold px-2' }}>Expired</div>
    // A product is good through its expiration day: the days left count that day too.
    case 'Fresh': {
      const days = Math.ceil(Duration.toDays(status.timeLeft))
      return <div props={{ className: 'text-xs px-2' }}>{days === 1 ? 'Expires today' : `${days} days left`}</div>
    }
  }
}

// A slight overshoot, so that a selected row pops out instead of just growing.
const popEase = 'ease-[cubic-bezier(0.34,1.56,0.64,1)]'

const isSelected = (selection: ItemSelection) =>
  selection._tag === 'Selected' || (selection._tag === 'Deleting' && selection.isSelected)

const productRow = (product: ValidProduct, { onPreventingDefault }: Handlers<Message>) => (
  <div
    key={product.id}
    props={{
      className: cn(
        'h-16 flex items-center gap-3 rounded-lg relative select-none [-webkit-touch-callout:none]',
        'transition-[translate,scale,box-shadow,background-color] duration-300',
        popEase,
        isSelected(product.selection)
          ? 'z-10 bg-secondary/25 shadow-md -translate-y-0.5 scale-[1.02]'
          : 'bg-secondary/5 shadow-sm',
      ),
    }}
    // A long press on Android (a right click on desktop).
    on={onPreventingDefault(
      'contextmenu',
      product.selection._tag === 'Unselected'
        ? product.selection.select
        : product.selection._tag === 'Selected'
        ? product.selection.deselect
        : undefined,
    )}
  >
    {expirationBadge(product.status)}
    <div props={{ className: 'flex flex-col relative z-20' }}>
      <div props={{ className: 'px-2' }}>{product.name}</div>
      {statusText(product.status)}
    </div>
    <span
      props={{
        className: cn(
          'material-symbols-rounded ml-auto mr-4 text-secondary [font-variation-settings:\'FILL\'_1] transition-[scale,opacity] duration-300',
          popEase,
          isSelected(product.selection) ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
        ),
      }}
    >
      check_circle
    </span>
  </div>
)

const iconButton = (icon: string, label: string) => (
  <span props={{ className: 'material-symbols-rounded px-2', title: label }}>{icon}</span>
)

/** Under the top bar: how many products there are, or what can be done with the selected ones. */
export const summary = (model: Model, dispatch: Dispatch<Message>) => {
  if (model._tag !== 'Available') {
    return []
  }
  const { on } = handlers(dispatch)
  const { deletion } = model
  return [
    <div props={{ className: 'z-50 w-full px-3.5 h-10 text-xs justify-between flex items-center' }}>
      {deletion._tag === 'Possible'
        ? [
          <button props={{ className: 'flex items-center' }} on={on('click', deletion.clearSelection)}>
            {iconButton('close', 'Clear the selection')}
            {`${deletion.count} selected`}
          </button>,
          <button props={{ className: 'flex items-center' }} on={on('click', deletion.deleteSelected)}>
            {iconButton('delete', 'Delete the selected products')}
          </button>,
        ]
        : deletion._tag === 'InProgress'
        ? 'Deleting…'
        : `${model.total} items`}
    </div>,
  ]
}

// Invalid and corrupt products are not shown yet (see AGENTS.md, "Refactoring status").
export const rows = (model: Model, dispatch: Dispatch<Message>) =>
  model._tag === 'Available'
    ? model.products.flatMap((product) => product._tag === 'Valid' ? [productRow(product, handlers(dispatch))] : [])
    : []
