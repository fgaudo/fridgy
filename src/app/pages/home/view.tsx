import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Opt from 'effect/Option'
import type { VNode, VNodeStyle } from 'snabbdom'
import type { Dispatch, View } from '@/libs/elm/view.ts'
import { cn } from '@/libs/ui/class-names.ts'
import type { Message } from './program/messages.ts'
import type { Model, ProductModel } from './program/model.ts'

type HomeDispatch = Dispatch<Message>
type ValidProduct = Data.TaggedEnum.Value<ProductModel, 'Valid'>

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

/** Fades in once inserted, and out before being removed. */
const fade: VNodeStyle = {
  opacity: '0',
  transition: 'opacity 200ms',
  delayed: { opacity: '1' },
  remove: { opacity: '0' },
}

/** The dimmed layer behind a modal or a menu; a click on it closes what is open. */
const backdrop = (key: string, className: string, onClick: () => void) => (
  <div
    key={key}
    style={fade}
    on={{ click: onClick }}
    props={{ className: cn('fixed top-0 bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xs', className) }}
  />
)

const field = (label: string, input: VNode) => (
  <div>
    <div>{label}</div>
    {input}
  </div>
)

const inputClassName = 'w-full bg-white focus:inset-ring-1 shadow-md rounded-md p-3'

const addProductModal = (addProduct: Model['addProduct'], dispatch: HomeDispatch): ReadonlyArray<VNode> => {
  if (addProduct._tag === 'Closed') {
    return []
  }
  return [
    backdrop('add-product-box-background', 'z-1000', () => {
      if (Opt.isSome(addProduct.close)) dispatch(addProduct.close.value)
    }),
    <div
      key='add-product-box'
      style={{
        ...fade,
        transform: 'scale(0.8)',
        transition: 'opacity 200ms, transform 200ms',
        delayed: { opacity: '1', transform: 'scale(1)' },
      }}
      props={{
        className:
          'w-3/4 m-auto z-1000 fixed bottom-0 left-0 right-0 flex flex-col p-4 gap-2 rounded-lg shadow-md bg-background mb-12',
      }}
    >
      <div props={{ className: 'font-bold' }}>Add a product</div>
      {field(
        'Name',
        <input
          hook={{
            insert: (node) => {
              ;(node.elm as HTMLInputElement).focus()
            },
          }}
          props={{
            className: inputClassName,
            type: 'text',
            value: addProduct.name,
            disabled: Opt.isNone(addProduct.changeName),
          }}
          on={{
            input: (event) => {
              if (Opt.isSome(addProduct.changeName)) dispatch(addProduct.changeName.value(inputValue(event)))
            },
          }}
        />,
      )}
      {field(
        'Expiration date',
        <input
          props={{
            className: inputClassName,
            type: 'date',
            value: addProduct.expirationDate.toString(),
            disabled: Opt.isNone(addProduct.changeExpiration),
          }}
          on={{
            input: (event) => {
              if (Opt.isSome(addProduct.changeExpiration)) {
                dispatch(addProduct.changeExpiration.value(inputValue(event)))
              }
            },
          }}
        />,
      )}
      <button
        props={{
          className: cn('w-full mt-4 shadow-md bg-secondary h-12 rounded-md p-3', {
            'opacity-50': Opt.isNone(addProduct.submit),
          }),
          disabled: Opt.isNone(addProduct.submit),
        }}
        on={{
          click: () => {
            if (Opt.isSome(addProduct.submit)) dispatch(addProduct.submit.value)
          },
        }}
      >
        {addProduct.isSubmitting ? 'Adding…' : 'Add'}
      </button>
    </div>,
  ]
}

const sideMenu = (model: Model, dispatch: HomeDispatch): ReadonlyArray<VNode> =>
  model.isMenuOpen
    ? [
      backdrop('side-menu-background', 'z-50 transition-colors', () => {
        if (Opt.isSome(model.closeMenu)) dispatch(model.closeMenu.value)
      }),
      <div
        key='side-menu'
        style={{
          transform: 'translateX(0)',
          transition: 'transform 200ms',
          delayed: { transform: 'translateX(100%)' },
          remove: { transform: 'translateX(0)' },
        }}
        props={{
          className: 'h-full bg-background z-60 top-0 rounded-r-2xl w-3/4 fixed -left-3/4 flex flex-col pt-sait',
        }}
      >
        <button
          props={{ className: 'flex items-center gap-4 h-14 px-6 text-left' }}
          on={{
            click: () => {
              if (Opt.isSome(model.requestInfo)) dispatch(model.requestInfo.value)
            },
          }}
        >
          <span props={{ className: 'material-symbols-rounded' }}>info</span>
          <span>About</span>
        </button>
      </div>,
    ]
    : []

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
    case 'Fresh': {
      const days = Math.ceil(Duration.toDays(status.timeLeft))
      return <div props={{ className: 'text-xs px-2' }}>{days === 1 ? '1 day left' : `${days} days left`}</div>
    }
  }
}

const productRow = (product: ValidProduct, dispatch: HomeDispatch) => (
  <div
    key={product.id}
    props={{
      className: cn(
        'h-16 flex items-center gap-3 rounded-lg shadow-sm relative select-none [-webkit-touch-callout:none]',
        product.isSelected ? 'bg-secondary/30 ring-2 ring-secondary' : 'bg-secondary/5',
      ),
    }}
    on={{
      // A long press on Android (a right click on desktop).
      contextmenu: (event: MouseEvent) => {
        event.preventDefault()
        if (Opt.isSome(product.changeSelection)) dispatch(product.changeSelection.value)
      },
    }}
  >
    {expirationBadge(product.status)}
    <div props={{ className: 'flex flex-col relative z-20' }}>
      <div props={{ className: 'px-2' }}>{product.name}</div>
      {statusText(product.status)}
    </div>
  </div>
)

export const view: View<Model, Message, VNode> = (model, dispatch) => {
  const fab = (
    <div
      props={{
        className: cn(
          { 'opacity-100': !model.isInteracting, 'opacity-30': model.isInteracting },
          'fixed bottom-5 right-5 flex items-end justify-center z-30 flex-col gap-6 transition-opacity duration-200',
        ),
      }}
    >
      <button
        props={{
          className:
            'relative shadow-md bg-red-200 flex items-center justify-evenly rounded-2xl h-16 w-16 text-red-400',
        }}
        on={{
          click: () => {
            if (Opt.isSome(model.openAddProduct)) dispatch(model.openAddProduct.value)
          },
        }}
      >
        <div props={{ className: 'material-symbols-rounded text-4xl!' }}>add</div>
      </button>
    </div>
  )
  const topBar = (
    <div
      props={{
        className: cn({
          'bg-background scale-[98%]': model.isViewportAtTop,
          'bg-secondary/60 backdrop-blur-md shadow-md scale-100': !model.isViewportAtTop,
        }, 'fixed w-full z-40 top-0 pl-sail pr-sair pt-sait transition-all duration-200'),
      }}
    >
      <div props={{ className: 'flex w-full items-center h-16' }}>
        <span
          props={{ className: 'px-4 material-symbols-rounded' }}
          on={{
            click: () => {
              if (Opt.isSome(model.openMenu)) dispatch(model.openMenu.value)
            },
          }}
        >
          menu
        </span>
        <div props={{ className: 'text-2xl font-bold px-2' }}>Fridgy</div>
      </div>
      {model.productListStatus._tag === 'Available' && (
        <div props={{ className: 'z-50 w-full px-3.5 h-10 text-xs justify-between flex items-center' }}>
          {`${model.productListStatus.total} items`}
        </div>
      )}
    </div>
  )
  // Invalid and corrupt products are not shown yet (see AGENTS.md, "Refactoring status").
  const productList = model.productListStatus._tag === 'Available'
    ? model.productListStatus.products.flatMap((product) =>
      product._tag === 'Valid' ? [productRow(product, dispatch)] : []
    )
    : []
  // While a modal or the menu is open, the page behind it does not scroll (see `styles.css`).
  const isScrollLocked = model.addProduct._tag === 'Open' || model.isMenuOpen
  return (
    <div props={{ className: cn({ 'scroll-locked': isScrollLocked }) }}>
      {addProductModal(model.addProduct, dispatch)}
      {sideMenu(model, dispatch)}
      {fab}
      {topBar}
      <div props={{ className: 'ml-sail mt-sait mr-sair' }}>
        <div props={{ className: 'p-2 flex gap-2 flex-col pb-48 pt-28' }}>{productList}</div>
      </div>
    </div>
  )
}
