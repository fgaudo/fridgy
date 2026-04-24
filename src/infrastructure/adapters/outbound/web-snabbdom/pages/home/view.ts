import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import { h } from 'snabbdom'

import type { Model } from '@/app/core/home/model.ts'
import { cn } from '@/infra/adapters/outbound/web-snabbdom/pages/helpers.ts'
import { UiService } from '@/infra/adapters/outbound/web-snabbdom/ui-service.ts'

export const makeView = Effect.gen(function*() {
  let isMenuOpen = false
  const run = yield* FiberSet.makeRuntimePromise()
  const { invalidateUi } = yield* UiService

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen
    run(invalidateUi)
  }

  return (model: Model) =>
    h('div', [
      // The Menu
      h('div', {
        hook: {
          destroy: () => run(Effect.log('DESTROY')),
          insert: () => run(Effect.log('INSERT')),
        },
        props: {
          className: cn(
            'duration-500 h-full bg-amber-500 z-40  w-3/4 fixed left-0 transition-opacity ',
            {
              'opacity-0': !isMenuOpen,
              'opacity-100': isMenuOpen,
            },
          ),
        },
      }),

      // Floating Action Buttons Container
      h('div', { props: { className: 'fixed bottom-5 right-5 flex items-end justify-center z-30 flex-col gap-6' } }, [
        h('button', {
          props: {
            className:
              'relative shadow-md bg-red-200 flex items-center justify-evenly rounded-2xl h-16 w-16 text-red-400',
          },
        }, [
          h('div', { props: { className: 'material-symbols-rounded text-4xl!' } }, 'add'),
        ]),
        h('button', {
          props: {
            className:
              'relative shadow-md bg-red-200 flex items-center justify-evenly rounded-2xl h-16 w-36 text-red-400',
          },
        }, [
          h('div', { props: { className: 'font-bold text-sm relative justify-center items-center flex' } }, [
            h('div', { props: { className: 'material-symbols-rounded text-5xl!' } }, 'crop_free'),
            h('div', { props: { className: 'absolute text-[9px]' } }, [
              'Exp.',
              h('br'),
              'date',
            ]),
          ]),
          h('div', { props: { className: 'font-bold text-sm' } }, 'Quick add'),
        ]),
      ]),

      // Top Bar
      h('div', { props: { className: 'fixed ml-sail mr-sair mt-sait top-0 w-full z-30 bg-white' } }, [
        h('div', { props: { className: 'items-center flex h-14' } }, [
          h('span', {
            on: {
              click: toggleMenu,
            },
            props: { className: 'px-4 material-symbols-rounded' },
          }, 'menu'),
          h('div', { props: { className: 'text-2xl font-bold px-2' } }, 'Fridgy'),
        ]),
      ]),

      // Product List Container
      h('div', { props: { className: 'ml-sail mt-sait mr-sair pb-24' } }, [
        h(
          'div',
          { props: { className: 'mt-14 p-2 flex gap-2 flex-col' } },
          model.productListStatus._tag === 'Available'
            ? model.productListStatus.products
              .filter((product) => product._tag === 'Valid')
              .map((product) =>
                h('div', {
                  key: product.id,
                  props: {
                    className:
                      'bg-amber-50 h-16 flex items-center gap-3 rounded-lg shadow-sm relative border-amber-100 border',
                  },
                }, [
                  h('div', {
                    props: {
                      className:
                        'z-20 ml-2 w-12 h-12 rounded-full leading-0 shadow-gray-300 relative shadow-md bg-red-300 flex items-center gap-1 justify-evenly flex-col',
                    },
                  }, [
                    h('div', { props: { className: 'text-white leading-0 font-bold text-lg' } }, '22'),
                    h('div', { props: { className: 'text-white leading-0 text-sm' } }, 'Oct'),
                  ]),
                  h('div', { props: { className: 'flex flex-col' } }, [
                    h('div', { props: { className: 'px-2 rounded relative z-20' } }, [
                      h('div', {}, product.name),
                    ]),
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
