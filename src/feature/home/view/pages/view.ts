import * as Effect from 'effect/Effect'
import { h } from 'snabbdom'
import { Dispatcher } from '@/feature/home/application/messages.ts'
import type { Model } from '@/feature/home/application/model.ts'
import { cn } from '@/libs/helpers1.ts'

function lockScroll(isLocked: boolean) {
  document.body.style.overflow = isLocked ? 'hidden' : ''
}

export const makeView = Effect.gen(function*() {
  const dispatch = yield* Dispatcher

  return ((model: Model, route: 'add' | 'default') => {
    const addProductModal = route === 'add'
      ? [
        h(
          'div',
          {
            style: {
              opacity: '0',
              transition: 'opacity 200ms',
              delayed: { opacity: '1' },
              remove: { opacity: '0' },
            },
            key: 'add-product-box-background',
            on: { click: () => dispatch({ _tag: 'AddProductToggled' }) },
            props: {
              className: 'fixed left-0 right-0 bottom-0 z-1000 top-0 bg-black/50 backdrop-blur-xs',
            },
          },
        ),
        h('div', {
          style: {
            opacity: '0',
            transform: 'scale(0.8)',
            transition: 'opacity 200ms, transform 200ms',
            delayed: { opacity: '1', transform: 'scale(1)' },
            remove: { opacity: '0' },
          },
          key: 'add-product-box',
          props: {
            className: 'w-3/4 m-auto z-1000 fixed bottom-0 left-0 right-0 flex flex-col p-4 gap-2 rounded-lg shadow-md bg-background mb-12',
          },
        }, [
          h('div', { props: { className: 'font-bold' } }, 'Add a product'),
          h('div', [
            h('div', 'Name'),
            h('input', {
              hook: {
                insert: (node) => {
                  ;(node.elm as HTMLInputElement).focus()
                },
              },
              props: {
                className: 'w-full bg-white focus:inset-ring-1 shadow-md rounded-md p-3',
              },
              attrs: { type: 'text', value: '' },
            }),
          ]),
          h('div', [
            h('div', 'Expiration date'),
            h('input', {
              props: {
                className: 'w-full bg-white focus:inset-ring-1 shadow-md rounded-md p-3',
              },
              attrs: { type: 'date' },
            }),
          ]),
          h('button', {
            props: {
              className: cn('w-full mt-4 shadow-md bg-secondary h-12 rounded-md p-3', {
                'asd': model,
              }),
            },
          }, 'Add'),
        ]),
      ]
      : []

    const sideMenu = model.isMenuOpen
      ? [
        h('div', {
          style: {
            opacity: '0',
            transition: 'opacity 200ms',
            delayed: { opacity: '1' },
            remove: { opacity: '0' },
          },
          key: 'side-menu-background',
          on: { click: () => dispatch({ _tag: 'MenuToggled' }) },
          props: {
            className: 'transition-colors fixed top-0 bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xs',
          },
        }),

        h('div', {
          key: 'side-menu',
          style: {
            transform: 'translateX(0)',
            transition: 'transform 200ms',
            delayed: { transform: 'translateX(100%)' },
            remove: { transform: 'translateX(0)' },
          },
          props: {
            className: cn(
              'h-full bg-background z-60  top-0 rounded-r-2xl w-3/4 fixed -left-3/4',
            ),
          },
        }),
      ]
      : []

    const fab = h('div', {
      props: {
        className: cn(
          { 'opacity-100': !model.isInteracting, 'opacity-30': model.isInteracting },
          'fixed bottom-5 right-5 flex items-end justify-center z-30 flex-col gap-6 transition-opacity duration-200',
        ),
      },
    }, [
      h('button', {
        on: { click: () => dispatch({ _tag: 'AddProductToggled' }) },
        props: {
          className: 'relative shadow-md bg-red-200 flex items-center justify-evenly rounded-2xl h-16 w-16 text-red-400',
        },
      }, h('div', { props: { className: 'material-symbols-rounded text-4xl!' } }, 'add')),
    ])

    const topBar = h('div', {
      props: {
        className: cn({
          'bg-background scale-[98%]': model.isViewportAtTop,
          'bg-secondary/60 backdrop-blur-md shadow-md scale-100': !model.isViewportAtTop,
        }, 'fixed w-full z-40 top-0 pl-sail pr-sair pt-sait transition-all duration-200'),
      },
    }, [
      h('div', { props: { className: 'flex w-full items-center h-16' } }, [
        h('span', {
          on: { click: () => dispatch({ _tag: 'MenuToggled' }) },
          props: { className: 'px-4 material-symbols-rounded' },
        }, 'menu'),
        h('div', { props: { className: 'text-2xl font-bold px-2' } }, 'Fridgy'),
      ]),
      model.productListStatus._tag === 'Available'
        ? h(
          'div',
          { props: { className: 'z-50 w-full px-3.5  h-10 text-xs justify-between flex items-center' } },
          `${model.productListStatus.total} items`,
        )
        : undefined,
    ])

    return h('div', {
      hook: {
        insert: () => lockScroll(route === 'add' || model.isMenuOpen),
        update: () => lockScroll(route === 'add' || model.isMenuOpen),
      },
    }, [
      ...addProductModal,
      ...sideMenu,
      fab,
      topBar,
      h('div', { props: { className: 'ml-sail mt-sait mr-sair' } }, [
        h(
          'div',
          { props: { className: 'p-2 flex gap-2 flex-col  pb-48 pt-28' } },
          model.productListStatus._tag === 'Available'
            ? model.productListStatus.products.filter((product) => product._tag === 'Valid').map((product) =>
              h('div', {
                key: product.id,
                props: { className: 'bg-secondary/5 h-16 flex items-center gap-3 rounded-lg shadow-sm relative' },
              }, [
                h('div', {
                  props: {
                    className: 'z-20 ml-2 w-12 h-12 rounded-full leading-0 shadow-gray-300 relative shadow-sm bg-secondary flex items-center gap-1 justify-evenly flex-col',
                  },
                }, [
                  h('div', { props: { className: 'text-white leading-0 font-bold text-lg' } }, '22'),
                  h('div', { props: { className: 'text-white leading-0 text-sm' } }, 'Oct'),
                ]),
                h('div', { props: { className: 'flex flex-col' } }, [
                  h('div', { props: { className: 'px-2 rounded relative z-20' } }, [h('div', {}, product.name)]),
                  h('div', { props: { className: 'text-xs text-red-400 font-bold px-2 rounded relative z-20' } }, [
                    h('div', {}, 'Expired'),
                  ]),
                ]),
              ])
            )
            : [h('div', {}, '')],
        ),
      ]),
    ])
  })
})
