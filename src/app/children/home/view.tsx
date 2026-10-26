import * as Tea from '@fgaudo/effect-tea'
import { thunk, type VNode } from 'snabbdom'
import { type Handlers, handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import { backdrop } from '#libs/ui/overlay.tsx'
import * as Products from './children/products/view.tsx'
import type { Message, Model } from './program.ts'

/**
 * Material's extended FAB: an icon and its action. While the list scrolls it shrinks to the icon alone, to leave
 * the products in view.
 */
const addButton = (model: Model, { on }: Handlers<Message>) => (
  <button
    props={{
      className: cn(
        'state-layer fixed right-4 bottom-4 z-30 mr-sair mb-saib flex h-14 items-center rounded-large px-4',
        'bg-primary-container text-on-primary-container shadow-elevation-3 hover:shadow-elevation-4',
        'transition-shadow duration-200',
      ),
      title: 'Add products',
    }}
    on={on('click', model.add)}
  >
    <span props={{ className: 'material-symbols-rounded' }}>barcode_scanner</span>
    <span
      props={{
        className: cn(
          'overflow-hidden whitespace-nowrap text-label-large transition-[max-width,margin,opacity] duration-200',
          model.isInteracting ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-40 opacity-100',
        ),
      }}
    >
      Add products
    </span>
  </button>
)

/** Material's modal navigation drawer. */
const sideMenu = (menu: Model['menu'], { on }: Handlers<Message>): ReadonlyArray<VNode> =>
  menu._tag === 'Open'
    ? [
      backdrop('side-menu-background', 'z-50', on('click', menu.close)),
      <div
        key='side-menu'
        style={{
          transform: 'translateX(-100%)',
          transition: 'transform 200ms',
          delayed: { transform: 'translateX(0)' },
          remove: { transform: 'translateX(-100%)' },
        }}
        props={{
          className:
            'fixed top-0 left-0 z-60 flex h-full w-[min(85vw,22.5rem)] flex-col rounded-r-large bg-surface-container-low px-3 pt-sait shadow-elevation-1',
        }}
      >
        <div props={{ className: 'flex h-14 items-center px-4 text-title-small text-on-surface-variant' }}>Fridgy</div>
        <button
          props={{
            className:
              'state-layer flex h-14 items-center gap-3 rounded-full pl-4 pr-6 text-left text-label-large text-on-surface-variant',
          }}
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
  const toProducts = Tea.dispatchTo(dispatch, 'Products')
  const selectionBar = Products.selectionBar(model.products, toProducts)
  const subtitle = Products.subtitle(model.products)
  const { isAtTop } = model
  // Material's small top app bar, with the emphasized title and a subtitle of Material 3 Expressive: the surface's
  // color at rest, filled with a container's once the list scrolls under it.
  const appBar = (
    <div props={{ className: 'flex h-16 items-center gap-1 px-1' }}>
      <button
        props={{
          className: 'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full',
          title: 'Open the menu',
        }}
        on={model.menu._tag === 'Closed' ? on('click', model.menu.open) : {}}
      >
        menu
      </button>
      <div props={{ className: 'flex min-w-0 flex-col px-1' }}>
        <h1 props={{ className: 'truncate text-title-large-emphasized' }}>Fridgy</h1>
        {subtitle === undefined
          ? []
          : [<span props={{ className: 'truncate text-label-medium text-on-surface-variant' }}>{subtitle}</span>]}
      </div>
    </div>
  )
  const topBar = (
    <div
      props={{
        className: cn(
          'fixed top-0 z-40 w-full pt-sait pl-sail pr-sair transition-colors duration-200',
          selectionBar !== undefined
            ? 'bg-secondary-container text-on-secondary-container'
            : isAtTop
            ? 'bg-surface text-on-surface'
            : 'bg-surface-container text-on-surface',
        ),
      }}
    >
      {selectionBar ?? appBar}
    </div>
  )
  // While the menu is open, the page behind it does not scroll (see `styles.css`).
  return (
    <div props={{ className: cn({ 'scroll-locked': model.menu._tag === 'Open' }) }}>
      {sideMenu(model.menu, events)}
      {addButton(model, events)}
      {topBar}
      <div props={{ className: 'ml-sail mt-sait mr-sair overflow-x-clip' }}>
        {
          // The part's dispatch is the same in every frame, and its model while its state is: opening the menu
          // or scrolling leave the list undrawn.
          thunk('div', 'products', Products.list, [model.products, toProducts])
        }
      </div>
    </div>
  )
}
