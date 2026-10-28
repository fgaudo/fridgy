import * as Tea from '@fgaudo/effect-tea'
import { thunk, type VNode } from 'snabbdom'
import { type Handlers, handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import * as Products from './children/products/view.tsx'
import type { Message, Model } from './program.ts'

/**
 * Material's extended FAB, with its icon filled: an icon and its action. While the list scrolls it shrinks to the
 * icon alone, to leave the products in view; it rises above the snackbar while one is shown.
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
    <span attrs={{ 'aria-hidden': 'true' }} props={{ className: 'material-symbols-rounded icon-filled' }}>
      barcode_scanner
    </span>
    <span
      props={{
        className: cn(
          'overflow-hidden whitespace-nowrap text-label-large transition-[max-width,margin,opacity]',
          // The cap in the label's own lines (`lh`): the one length the WebView scales with the user's font size.
          model.isInteracting ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[8lh] opacity-100',
        ),
      }}
    >
      Add products
    </span>
  </button>
)

/**
 * Material's menu, growing from the bar's trailing icon button; a tap anywhere else closes it. Both are drawn in
 * the bar, whose stacking context keeps the menu above the tap catcher.
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
          <span
            attrs={{ 'aria-hidden': 'true' }}
            props={{ className: 'material-symbols-rounded text-on-surface-variant' }}
          >
            info
          </span>
          <span props={{ className: 'pr-3' }}>About</span>
        </button>
      </div>,
    ]
    : []

export const view: View<Model, Message> = (model, dispatch) => {
  const events = handlers(dispatch)
  const { on } = events
  const toProducts = Tea.dispatchTo(dispatch, 'Products')
  const selection = Products.selectionBar(model.products, toProducts)
  const subtitle = Products.subtitle(model.products)
  const snackbar = Products.snackbar(model.products, toProducts)
  const { isAtTop } = model
  const moreButton = (
    <button
      attrs={{ 'aria-label': 'More options' }}
      props={{
        className: 'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full',
        title: 'More options',
      }}
      on={model.menu._tag === 'Closed' ? on('click', model.menu.open) : {}}
    >
      more_vert
    </button>
  )
  // Material's medium top app bar, collapsed to a small one in a container's color once the list scrolls under it.
  // The contextual bar of the selected products takes the same shape, in its own colors.
  const topBar = (
    <div
      props={{
        className: cn(
          'fixed top-0 z-40 w-full pt-sait pl-sail pr-sair transition-colors',
          selection !== undefined
            ? 'bg-secondary-container text-on-secondary-container'
            : isAtTop
            ? 'bg-surface text-on-surface'
            : 'bg-surface-container text-on-surface',
        ),
      }}
    >
      <div props={{ className: cn('relative transition-[height]', isAtTop ? 'h-31' : 'h-16') }}>
        <div props={{ className: 'absolute inset-x-0 top-0 flex h-16 items-center justify-between px-1' }}>
          <div>{selection === undefined ? [] : [selection.leading]}</div>
          {selection === undefined ? moreButton : selection.trailing}
        </div>
        <div
          props={{
            className: cn(
              'absolute right-16 bottom-0 flex flex-col transition-[left,padding]',
              isAtTop ? 'pb-5' : 'pb-2.5',
              isAtTop || selection === undefined ? 'left-4' : 'left-14',
            ),
          }}
        >
          <h1
            props={{
              className: cn(
                'truncate transition-[font-size,line-height]',
                isAtTop ? 'text-headline-medium-emphasized' : 'text-title-large-emphasized',
              ),
            }}
          >
            {selection === undefined ? 'Fridgy' : selection.title}
          </h1>
          {subtitle === undefined ? [] : [
            <span
              props={{
                className: cn(
                  'truncate transition-[font-size,line-height]',
                  selection === undefined && 'text-on-surface-variant',
                  isAtTop ? 'text-label-large' : 'text-label-medium',
                ),
              }}
            >
              {subtitle}
            </span>,
          ]}
        </div>
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
      <div props={{ className: 'snackbar-slot' }}>
        {snackbar === undefined ? [] : [snackbar]}
      </div>
    </div>
  )
}
