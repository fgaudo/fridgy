import { mapDispatch } from '@fgaudo/effect-tea'
import type { VNode } from 'snabbdom'
import { type Handlers, handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import { fromAddProduct, fromProducts, type Message, type Model } from './program.ts'
import * as AddProduct from './parts/add-product.view.tsx'
import { backdrop } from '#libs/ui/overlay.tsx'
import * as Products from './parts/products.view.tsx'

const sideMenu = (menu: Model['menu'], { on }: Handlers<Message>): ReadonlyArray<VNode> =>
  menu._tag === 'Open'
    ? [
      backdrop('side-menu-background', 'z-50 transition-colors', on('click', menu.close)),
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
          on={on('click', menu.requestInfo)}
        >
          <span props={{ className: 'material-symbols-rounded' }}>info</span>
          <span>About</span>
        </button>
      </div>,
    ]
    : []

export const view: View<Model, Message> = (model, dispatch) => {
  const events = handlers(dispatch)
  const { on } = events
  const addProductDispatch = mapDispatch(dispatch, fromAddProduct)
  const productsDispatch = mapDispatch(dispatch, fromProducts)
  const topBar = (
    <div
      props={{
        className: cn({
          'bg-background scale-[98%]': model.scrolling.isAtTop,
          'bg-secondary/60 backdrop-blur-md shadow-md scale-100': !model.scrolling.isAtTop,
        }, 'fixed w-full z-40 top-0 pl-sail pr-sair pt-sait transition-all duration-200'),
      }}
    >
      <div props={{ className: 'flex w-full items-center h-16' }}>
        <span
          props={{ className: 'px-4 material-symbols-rounded' }}
          on={model.menu._tag === 'Closed' ? on('click', model.menu.open) : {}}
        >
          menu
        </span>
        <div props={{ className: 'text-2xl font-bold px-2' }}>Fridgy</div>
      </div>
      {Products.summary(model.products, productsDispatch)}
    </div>
  )
  // While a modal or the menu is open, the page behind it does not scroll (see `styles.css`).
  const isScrollLocked = model.addProduct._tag !== 'Closed' || model.menu._tag === 'Open'
  return (
    <div props={{ className: cn({ 'scroll-locked': isScrollLocked }) }}>
      {AddProduct.modal(model.addProduct, addProductDispatch)}
      {sideMenu(model.menu, events)}
      {AddProduct.addButton(model.addProduct, addProductDispatch, model.scrolling.isInteracting)}
      {topBar}
      <div props={{ className: 'ml-sail mt-sait mr-sair overflow-x-clip' }}>
        <div props={{ className: 'p-2 flex gap-2 flex-col pb-48 pt-28' }}>
          {Products.rows(model.products, productsDispatch)}
        </div>
      </div>
    </div>
  )
}
