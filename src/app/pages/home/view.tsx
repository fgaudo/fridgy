import * as Tea from '@fgaudo/effect-tea'
import { thunk, type VNode } from 'snabbdom'
import { type Handlers, handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { Message, Model } from './program.ts'
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
  const toAddProduct = Tea.dispatchTo(dispatch, 'AddProduct')
  const toProducts = Tea.dispatchTo(dispatch, 'Products')
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
      {Products.summary(model.products, toProducts)}
    </div>
  )
  // While a modal or the menu is open, the page behind it does not scroll (see `styles.css`).
  const isScrollLocked = model.addProduct._tag !== 'Closed' || model.menu._tag === 'Open'
  return (
    <div props={{ className: cn({ 'scroll-locked': isScrollLocked }) }}>
      {AddProduct.modal(model.addProduct, toAddProduct)}
      {sideMenu(model.menu, events)}
      {AddProduct.addButton(model.addProduct, toAddProduct, model.scrolling.isInteracting)}
      {topBar}
      <div props={{ className: 'ml-sail mt-sait mr-sair overflow-x-clip' }}>
        {
          // The part's dispatch is the same in every frame, and its model while its state is: typing in the
          // form, opening the menu or scrolling leave the list undrawn.
          thunk('div', 'products', Products.list, [model.products, toProducts])
        }
      </div>
    </div>
  )
}
