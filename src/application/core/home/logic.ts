import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'
import { InternalMessage } from '@/app/core/home/messages.ts'
import type { Transition } from '@/app/core/transition.ts'
import { ViewportCommands } from '@/app/ports/outbound/viewport-commands.ts'
import { ViewportEvents } from '@/app/ports/outbound/viewport-events.ts'
import * as UC from '@/app/use-cases/index.ts'
import { ProductChanges } from '@/app/use-cases/products.ts'
import type * as StateManager from '@/shared/fsm.ts'
import * as ArrX from '@/shared/non-empty-array.ts'
import * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'
import { FetchListVersion, type State } from './model.ts'

export type UseCases =
  | UC.DeleteProductsByIds.DeleteProductsByIds
  | UC.Products.GetProducts
  | ViewportCommands

type ProductDTO = Data.TaggedEnum.Value<
  State['productListData'],
  'Available'
>['products'][0]
const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
  state: State,
  maybeProducts: Result.Result.Success<UC.Products.Response>['maybeProducts'],
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
  const hasFreshProducts = Arr.some(
    mappedProducts,
    (p) => p._tag === 'Valid' && p.status._tag === 'Fresh',
  )
  if (state.productListData._tag !== 'Available') {
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          _tag: 'Available' as const,
          activity: 'idle' as const,
          hasFreshProducts,
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
        hasFreshProducts,
        maybeSelectedProducts: state.productListData.maybeSelectedProducts.pipe(
          Opt.bindTo('selectedProducts'),
          Opt.bind('newProducts', () =>
            maybeProducts.pipe(
              Opt.map(Arr.filter((product) => product._tag !== 'Invalid')),
              Opt.map(Arr.map((product) => product.id)),
              Opt.map(HashSet.make),
            )),
          Opt.map(({ selectedProducts, newProducts }) => HashSet.intersection(newProducts, selectedProducts)),
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
  InternalMessage,
  ReturnType<
    (
      message: InternalMessage,
    ) => (
      state: State,
    ) => Transition<State, InternalMessage, UC.All | ViewportCommands>
  >
>()({
  ProductsChanged: ({ response }) => (state) => {
    if (Result.isSuccess(response)) {
      return updateFetchListSucceeded(
        {
          ...state,
          versions: {
            ...state.versions,
            manualFetcher: FetchListVersion.increment(state.versions.manualFetcher),
          },
        },
        response.success.maybeProducts,
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
    commands: [
      ...(!isInteracting && state.isViewportCloseToTop
        ? [
          Effect.service(ViewportCommands).pipe(
            Effect.andThen(({ scrollToTop }) => scrollToTop),
            Effect.map(() => InternalMessage.NoOp()),
          ),
        ]
        : []),
    ],
  }),

  ToggleMenu: () => (state) => {
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
        commands: [notifyWrongState(message)],
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
        commands: [notifyWrongState(message)],
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

  FetchProductsCompleted: (message) => (state) => {
    if (state.versions.manualFetcher !== message.version) {
      return {
        state,
        commands: [notifyStale(message)],
      }
    }
    if (state.productListData.activity !== 'fetching') {
      return {
        state,
        commands: [notifyWrongState(message)],
      }
    }
    if (Result.isSuccess(message.response)) {
      return updateFetchListSucceeded(state, message.response.success.maybeProducts)
    }
    return updateFetchListFailed(state)
  },

  DeleteProducts: (message) => (state) => {
    if (
      state.productListData._tag !== 'Available'
      || state.productListData.activity === 'fetching'
      || state.productListData.activity === 'deleting'
    ) {
      return {
        state,
        commands: [notifyWrongState(message)],
      }
    }
    if (Opt.isNone(state.productListData.maybeSelectedProducts)) {
      return {
        state,
        commands: [notifyWrongState(message)],
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
        deleteProducts({
          ids: state.productListData.maybeSelectedProducts.value,
        }),
      ],
    }
  },

  FetchProducts: (message) => (state) => {
    if (
      state.productListData.activity !== 'idle'
    ) {
      return {
        state,
        commands: [notifyWrongState(message)],
      }
    }
    const nextFetchVersion = FetchListVersion.increment(
      state.versions.manualFetcher,
    )
    return {
      state: {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'fetching' as const,
        },
        versions: {
          ...state.versions,
          manualFetcher: nextFetchVersion,
        },
      },
      commands: [fetchList(nextFetchVersion)],
    }
  },
  NoOp: () => (state) => ({ state }),
  ToggleItem: (message) => (state) => {
    if (
      state.productListData._tag !== 'Available'
      || (state.productListData.activity !== 'idle')
    ) {
      return {
        state,
        commands: [notifyWrongState(message)],
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

export const subscriptions: StateManager.Emitter<
  State,
  InternalMessage,
  ViewportEvents | ProductChanges
> = (state: State) => {
  const map: ReturnType<typeof subscriptions> = HashMap.make(
    [
      'products',
      Effect.service(ProductChanges).pipe(
        Effect.map((changes) => changes(Stream.tick('30 seconds'))),
        Stream.unwrap,
        Stream.map((response) => InternalMessage.ProductsChanged({ response })),
      ),
    ],
    [
      'activity',
      Effect.service(ViewportEvents).pipe(
        Effect.map((a) => a.activity$),
        Stream.unwrap,
        Stream.map((isInteracting) => InternalMessage.InteractionChanged({ isInteracting })),
      ),
    ],
    [
      'isWindowTop',
      Effect.service(ViewportEvents).pipe(
        Effect.map((a) => a.isAtTop$),
        Stream.unwrap,
        Stream.map((isAtTop) => InternalMessage.ViewportAtTopChanged({ isAtTop })),
      ),
    ],
    [
      'isWindowCloseToTop',
      Effect.service(ViewportEvents).pipe(
        Effect.map((a) => a.isCloseToTop$),
        Stream.unwrap,
        Stream.map((isCloseToTop) => InternalMessage.ViewportCloseToTopChanged({ isCloseToTop })),
      ),
    ],
  )

  return map
}

export const init: StateManager.Step<State, InternalMessage, UseCases | ViewportCommands> = T.make(
  {
    isViewportCloseToTop: false,
    isMenuOpen: false,
    isViewportAtTop: true,
    isInteracting: false,
    productListData: { _tag: 'Initial', activity: 'idle' },
    versions: {
      manualFetcher: FetchListVersion.make(0n),
    },
  },
  [Effect.succeed(InternalMessage.FetchProducts())],
)

const notifyWrongState = Effect.fn(function*(message: { _tag: string }) {
  yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
  return InternalMessage.NoOp()
})

const notifyStale = Effect.fn(function*(message: { _tag: string }) {
  yield* Effect.logInfo(`Triggered stale ${message._tag}`)
  return InternalMessage.NoOp()
})

const fetchList = Effect.fn(function*(version: bigint) {
  const getProducts = yield* UC.Products.GetProducts
  const result = yield* getProducts
  return InternalMessage.FetchProductsCompleted({ response: result, version })
})

const deleteProducts = Effect.fn(function*(
  params: Parameters<UC.DeleteProductsByIds.DeleteProductsByIds['Service']>[0],
) {
  const deleteProducts = yield* UC.DeleteProductsByIds.DeleteProductsByIds
  {
    const result = yield* deleteProducts(params)
    return InternalMessage.DeleteProductsCompleted({ response: result })
  }
})
