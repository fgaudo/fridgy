import * as Tea from '@fgaudo/effect-tea'
import { thunk, type VNode } from 'snabbdom'
import { type Handlers, handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import * as Products from './children/products/view.tsx'
import type { Message, Model } from './program.ts'

/**
 * Material's extended FAB: an icon and its action. While the list scrolls it shrinks to the icon alone, to leave
 * the products in view; it rises above the snackbar while one is shown.
 */
const addButton = (model: Model, isAboveSnackbar: boolean, { on }: Handlers<Message>) => (
  <button
    props={{
      className: cn(
        'state-layer fixed right-4 z-30 mr-sair mb-saib flex h-14 items-center rounded-large px-4',
        'bg-primary-container text-on-primary-container shadow-elevation-3 hover:shadow-elevation-4',
        'transition-[bottom,box-shadow]',
        isAboveSnackbar ? 'bottom-20' : 'bottom-4',
      ),
      title: 'Add products',
    }}
    on={on('click', model.add)}
  >
    <span props={{ className: 'material-symbols-rounded' }}>barcode_scanner</span>
    <span
      props={{
        className: cn(
          'overflow-hidden whitespace-nowrap text-label-large transition-[max-width,margin,opacity]',
          model.isInteracting ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-40 opacity-100',
        ),
      }}
    >
      Add products
    </span>
  </button>
)

/**
 * Material's menu, under the top app bar's trailing icon button, growing from it; a tap anywhere else closes it.
 * Both are drawn in the bar, whose stacking context keeps the menu above what the tap catcher covers, whichever
 * bar is shown: a menu opened stays open until it is closed.
 */
const menu = (menu: Model['menu'], { on }: Handlers<Message>): ReadonlyArray<VNode> =>
  menu._tag === 'Open'
    ? [
      <div key='menu-outside' on={on('click', menu.close)} props={{ className: 'fixed inset-0 z-10' }} />,
      <div
        key='menu'
        style={{
          opacity: '0',
          transform: 'scale(0.8)',
          transitionProperty: 'opacity, transform',
          transitionDuration: 'var(--transition-duration-medium-4)',
          transitionTimingFunction: 'var(--ease-emphasized-decelerate)',
          delayed: { opacity: '1', transform: 'scale(1)' },
          remove: {
            opacity: '0',
            transform: 'scale(0.8)',
            transitionDuration: 'var(--transition-duration-short-4)',
            transitionTimingFunction: 'var(--ease-emphasized-accelerate)',
          },
        }}
        props={{
          className: cn(
            'absolute top-14 right-1 z-20 flex min-w-28 origin-top-right flex-col rounded-extra-small py-2',
            'bg-surface-container text-on-surface shadow-elevation-2',
          ),
        }}
      >
        <button
          props={{ className: 'state-layer flex h-12 items-center gap-3 px-3 text-left text-label-large' }}
          on={on('click', menu.requestInfo)}
        >
          <span props={{ className: 'material-symbols-rounded text-on-surface-variant' }}>info</span>
          <span props={{ className: 'pr-3' }}>About</span>
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
  const snackbar = Products.snackbar(model.products, toProducts)
  const { isAtTop } = model
  // Material's small top app bar, with the emphasized title and a subtitle of Material 3 Expressive: the surface's
  // color at rest, filled with a container's once the list scrolls under it.
  const appBar = (
    <div props={{ className: 'flex h-16 items-center gap-1 px-1' }}>
      <div props={{ className: 'flex min-w-0 grow flex-col px-3' }}>
        <h1 props={{ className: 'truncate text-title-large-emphasized' }}>Fridgy</h1>
        {subtitle === undefined
          ? []
          : [<span props={{ className: 'truncate text-label-medium text-on-surface-variant' }}>{subtitle}</span>]}
      </div>
      <button
        props={{
          className: 'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full',
          title: 'More options',
        }}
        on={model.menu._tag === 'Closed' ? on('click', model.menu.open) : {}}
      >
        more_vert
      </button>
    </div>
  )
  const topBar = (
    <div
      props={{
        className: cn(
          'fixed top-0 z-40 w-full pt-sait pl-sail pr-sair transition-colors',
          selectionBar !== undefined
            ? 'bg-secondary-container text-on-secondary-container'
            : isAtTop
            ? 'bg-surface text-on-surface'
            : 'bg-surface-container text-on-surface',
        ),
      }}
    >
      <div props={{ className: 'relative' }}>
        {selectionBar ?? appBar}
        {menu(model.menu, events)}
      </div>
    </div>
  )
  // While the menu is open, the page behind it does not scroll (see `styles.css`). The page stays as it is under
  // the one drawn over it until that one is in place, then goes: a removed element leaves only once a transition
  // of its own ends, so it fades, in no time, once the other page's entrance is over.
  return (
    <div
      key='Home'
      style={{
        remove: {
          opacity: '0',
          pointerEvents: 'none',
          transition:
            'opacity var(--transition-duration-short-1) var(--ease-standard) var(--transition-duration-medium-4)',
        },
      }}
      props={{ className: cn({ 'scroll-locked': model.menu._tag === 'Open' }) }}
    >
      {addButton(model, snackbar !== undefined, events)}
      {topBar}
      <div props={{ className: 'ml-sail mt-sait mr-sair overflow-x-clip' }}>
        {
          // The part's dispatch is the same in every frame, and its model while its state is: opening the menu
          // or scrolling leave the list undrawn.
          thunk('div', 'products', Products.list, [model.products, toProducts])
        }
      </div>
      {/* Always there, so that the snackbar enters and leaves with its own transitions. */}
      <div props={{ className: 'pointer-events-none fixed right-4 bottom-4 left-4 z-30 mr-sair mb-saib ml-sail' }}>
        {snackbar === undefined ? [] : [snackbar]}
      </div>
    </div>
  )
}
