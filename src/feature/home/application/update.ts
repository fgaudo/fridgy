import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as T from 'effect/Tuple'
import type { Transition } from '@/core/application/transition.ts'
import type { AddProduct } from '@/feature/home/application/outbound/add-product.ts'
import type { DeleteProductById } from '@/feature/home/application/outbound/delete-product-by-id.ts'
import type * as StateManager from '@/shared/fsm.ts'
import * as ArrX from '@/shared/non-empty-array.ts'
import * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'
import * as Cmd from './commands.ts'
import type { Message } from './messages.ts'
import { FetchListVersion, type State } from './model.ts'
import type * as ProductsRead from './outbound/products-read.ts'

export type UseCases = ProductsRead.ProductsRead | AddProduct | DeleteProductById

type ProductDTO = Data.TaggedEnum.Value<
  State['productListData'],
  'Available'
>['products'][0]
const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
  state: State,
  maybeProducts: Result.Result.Success<Data.TaggedEnum.Value<Message, 'ProductsChanged'>['result']>,
) {
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
}

function updateFetchListFailed(state: State) {
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

export const update = Match.typeTags<
  Message,
  ReturnType<
    (
      message: Message,
    ) => (
      state: State,
    ) => Transition<State, Message, UseCases>
  >
>()({
  ExpirationDateChanged: (message) => (state) => {
    const result = DateTime.make(message.expiration)
    return { state: { ...state, maybeExpirationDate: result } }
  },

  NameChanged: (message) => (state) => {
    return { state: { ...state, maybeName: Opt.some(message.name) } }
  },

  AddProductCompleted: (message) => (state) => {
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'idle',
        },
      } satisfies State,
    }
  },

  AddProductStarted: (message) => (state) => {
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
    if (Result.isSuccess(result)) {
      return updateFetchListSucceeded(
        {
          ...state,
          versions: {
            ...state.versions,
            manualFetcher: FetchListVersion.increment(state.versions.manualFetcher),
          },
        },
        result.success,
      )
    }
    return updateFetchListFailed(
      {
        ...state,
        versions: {
          ...state.versions,
          manualFetcher: FetchListVersion.increment(state.versions.manualFetcher),
        },
      },
    )
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
      state: {
        ...state,
        isViewportCloseToTop: isCloseToTop,
      },
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

export const init: StateManager.Step<State, Message, UseCases> = T.make(
  {
    addProduct: { maybeExpirationDate: Opt.none(), maybeName: Opt.none(), isSubmittable: false },
    isViewportCloseToTop: false,
    isMenuOpen: false,
    isViewportAtTop: true,
    isInteracting: false,
    productListData: { _tag: 'Initial', activity: 'idle' },
    versions: {
      manualFetcher: FetchListVersion.make(0n),
    },
  } satisfies State,
  [],
)
