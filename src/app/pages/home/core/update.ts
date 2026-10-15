import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'

import type * as Engine from '@/libs/elm/engine.ts'
import * as ArrX from '@/libs/collections/non-empty-array.ts'
import * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as Cmd from './commands.ts'
import type { InternalMessage } from './messages.ts'
import { FetchListVersion, type State } from './state.ts'
import type { Notifications } from '../ports/notifications.ts'
import type { Products } from '../ports/products.ts'
import type { Viewport } from '../ports/viewport.ts'

export type Deps = Products | Viewport | Notifications

type ProductDTO = Data.TaggedEnum.Value<
  State['productListData'],
  'Available'
>['products'][0]
const ProductDTO = Data.taggedEnum<ProductDTO>()

export const update = Match.typeTags<
  InternalMessage,
  ReturnType<
    (
      message: InternalMessage,
    ) => (
      state: State,
    ) => Engine.Step<State, InternalMessage, Deps>
  >
>()({
  ExpirationDateChanged: (message) => (state) => {
    const result = DateTime.make(message.expiration)
    return { state: { ...state, maybeExpirationDate: result } }
  },

  NameChanged: (message) => (state) => {
    return { state: { ...state, maybeName: Opt.some(message.name) } }
  },

  AddProductCompleted: ({ succeeded }) => (state) => {
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'idle',
        },
      } satisfies State,
      commands: succeeded ? [] : [Cmd.showToast('Could not add the product')],
    }
  },

  AddProductStarted: (message) => (state) => {
    if (
      state.addProduct._tag === 'Closed'
    ) {
      return { state, commands: [Cmd.notifyWrongState(message)] }
    }

    if (
      state.productListData.activity !== 'idle'
      || Opt.isNone(state.addProduct.maybeName)
    ) {
      return { state, commands: [Cmd.notifyWrongState(message)] }
    }
    return {
      state: {
        ...state,
        versions: {
          ...state.versions,
        },
        productListData: {
          ...state.productListData,
          activity: 'adding',
        },
      } satisfies State,
      commands: [
        Cmd.addProduct({
          maybeExpirationDate: state.addProduct.maybeExpirationDate,
          maybeName: state.addProduct.maybeName,
        }),
      ],
    }
  },

  AddProductToggled: () => (state) => {
    return {
      state,
    }
  },

  ProductsChanged: ({ result }) => (state) => {
    return {
      state,
      commands: [Cmd.validateProducts(result)],
    }
  },

  ProductsValidated: ({ result }) => (state) => {
    if (Result.isFailure(result)) {
      if (state.productListData._tag === 'Initial') {
        return {
          state,
        }
      }
      return {
        state: {
          ...state,
          productListData: {
            ...state.productListData,
            _tag: 'Error' as const,
            activity: 'idle' as const,
          },
        },
      }
    }
    const maybeProducts = result.success
    if (Opt.isNone(maybeProducts)) {
      return {
        state: {
          ...state,
          productListData: {
            ...state.productListData,
            _tag: 'Empty' as const,
            activity: 'idle' as const,
          },
        },
      }
    }
    const mappedProducts = Arr.map(maybeProducts.value, (product) => {
      if (product._tag === 'Invalid') {
        return ProductDTO.Corrupt({ ...product, id: Symbol('id') })
      }
      return product
    })
    if (state.productListData._tag !== 'Available') {
      return {
        state: {
          ...state,
          productListData: {
            ...state.productListData,
            _tag: 'Available' as const,
            activity: 'idle' as const,
            maybeSelectedProducts: Opt.none(),
            products: mappedProducts,
            total: ArrX.length(maybeProducts.value),
          },
        } satisfies State,
      }
    }
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'idle' as const,
          maybeSelectedProducts: state.productListData.maybeSelectedProducts.pipe(
            Opt.bindTo('selectedProducts'),
            Opt.bind('newProducts', () =>
              maybeProducts.pipe(
                Opt.map(Arr.filter((product) => product._tag !== 'Invalid')),
                Opt.map(Arr.map((product) => product.id)),
                Opt.map(HashSet.make),
              )),
            Opt.map(
              ({ selectedProducts, newProducts }) => HashSet.intersection(newProducts, selectedProducts),
            ),
            Opt.andThen(NonEmptyHashSet.make),
          ),
          products: mappedProducts,
          total: ArrX.length(maybeProducts.value),
        },
      },
    }
  },

  InteractionChanged: ({ isInteracting }) => (state) => ({
    state: { ...state, isInteracting },
  }),

  MenuToggled: () => (state) => {
    return {
      state: {
        ...state,
        isMenuOpen: !state.isMenuOpen,
      },
    }
  },

  ViewportCloseToTopChanged: ({ isCloseToTop }) => (state) => {
    return {
      state,
      commands: !state.isInteracting && isCloseToTop
        ? [
          Cmd.scrollToTop,
        ]
        : [],
    }
  },

  ViewportAtTopChanged: ({ isAtTop }) => (state) => {
    return {
      state: { ...state, isViewportAtTop: isAtTop },
    }
  },

  ClearSelected: (message) => (state) => {
    if (
      state.productListData.activity !== 'idle'
      || state.productListData._tag !== 'Available'
      || Opt.isNone(state.productListData.maybeSelectedProducts)
    ) {
      return {
        state,
        commands: [Cmd.notifyWrongState(message)],
      }
    }
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          maybeSelectedProducts: Opt.none(),
        },
      },
    }
  },

  DeleteProductsCompleted: (message) => (state) => {
    if (state.productListData.activity !== 'deleting') {
      return {
        state,
        commands: [Cmd.notifyWrongState(message)],
      }
    }
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'idle' as const,
        },
      },
      commands: message.succeeded ? [] : [Cmd.showToast('Could not delete the products')],
    }
  },

  DeleteStarted: (message) => (state) => {
    if (
      state.productListData._tag !== 'Available'
      || state.productListData.activity === 'fetching'
      || state.productListData.activity === 'deleting'
    ) {
      return {
        state,
        commands: [Cmd.notifyWrongState(message)],
      }
    }
    if (Opt.isNone(state.productListData.maybeSelectedProducts)) {
      return {
        state,
        commands: [Cmd.notifyWrongState(message)],
      }
    }
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'deleting' as const,
        },
        versions: {
          ...state.versions,
          manualFetcher: FetchListVersion.increment(
            state.versions.manualFetcher,
          ),
        },
      },
      commands: [
        Cmd.deleteProducts({
          ids: state.productListData.maybeSelectedProducts.value,
        }),
      ],
    }
  },

  NoOp: () => (state) => ({ state }),
  ItemToggled: (message) => (state) => {
    if (
      state.productListData._tag !== 'Available'
      || (state.productListData.activity !== 'idle')
    ) {
      return {
        state,
        commands: [Cmd.notifyWrongState(message)],
      }
    }
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          maybeSelectedProducts: state.productListData.maybeSelectedProducts.pipe(
            Opt.match({
              onNone: () => HashSet.make(message.id),
              onSome: (map) =>
                HashSet.has(map, message.id)
                  ? HashSet.remove(map, message.id)
                  : HashSet.add(map, message.id),
            }),
            NonEmptyHashSet.make,
          ),
        },
      },
    }
  },
})

export const init: Engine.Step<State, InternalMessage, Deps> = {
  state: {
    addProduct: { _tag: 'Closed' },
    isMenuOpen: false,
    isViewportAtTop: true,
    isInteracting: false,
    productListData: { _tag: 'Initial', activity: 'idle' },
    versions: {
      manualFetcher: FetchListVersion.make(0n),
    },
  },
}
