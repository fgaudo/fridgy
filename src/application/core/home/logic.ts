import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'
import { InternalMessage } from '@/app/core/messages.ts'
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

type ProductDTO = Data.TaggedEnum.Value<
  State['productListData'],
  'Available'
>['products'][0]
const ProductDTO = Data.taggedEnum<ProductDTO>()

function updateFetchListSucceeded(
  state: State,
  maybeProducts: Data.TaggedEnum.Value<
    InternalMessage,
    'Home_FetchListSucceeded'
  >['response']['maybeProducts'],
) {
  if (Opt.isNone(maybeProducts)) {
    return T.make(
      {
        ...state,
        productListData: {
          ...state.productListData,
          _tag: 'Empty' as const,
          activity: 'idle' as const,
        },
      },
      [],
    )
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
    return T.make(
      {
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
      [],
    )
  }
  return T.make(
    {
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
    [],
  )
}

function updateFetchListFailed(state: State) {
  if (state.productListData._tag === 'Initial') {
    return T.make(state, [])
  }
  return T.make(
    {
      ...state,
      productListData: {
        ...state.productListData,
        _tag: 'Error' as const,
        activity: 'idle' as const,
      },
    },
    [],
  )
}

export const update = Match.typeTags<
  Extract<InternalMessage, Record<'_tag', `Home_${string}`>>,
  ReturnType<StateManager.Update<State, InternalMessage, UseCases | ViewportCommands | DateTime.CurrentTimeZone>>
>()({
  Home_GoodListReceived: ({ response }) => (state) => {
    return updateFetchListSucceeded(
      {
        ...state,
        versions: {
          ...state.versions,
          manualFetcher: FetchListVersion.increment(state.versions.manualFetcher),
        },
      },
      response.maybeProducts,
    )
  },
  Home_BadListReceived: () => (state) => {
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
  Home_Interacting: ({ state: isInteracting }) => (state) =>
    T.make(
      { ...state, isInteracting },
      [
        ...(!isInteracting && state.isWindowCloseToTop
          ? [
            Effect.gen(function*() {
              const { scrollToTop } = yield* ViewportCommands
              yield* scrollToTop
              return InternalMessage.NoOp()
            }),
          ]
          : []),
      ],
    ),

  Home_ToggleMenu: () => (state) => {
    return T.make({ ...state, isMenuOpen: !state.isMenuOpen }, [])
  },

  Home_WindowCloseToTop: ({ state: isWindowCloseToTop }) => (state) => {
    return T.make({ ...state, isWindowCloseToTop }, [])
  },

  Home_WindowAtTop: ({ state: isWindowAtTop }) => (state) => {
    return T.make({ ...state, isWindowAtTop }, [])
  },

  Home_ClearSelected: (message) => (state) => {
    if (
      state.productListData.activity !== 'idle'
      || state.productListData._tag !== 'Available'
      || Opt.isNone(state.productListData.maybeSelectedProducts)
    ) {
      return T.make(state, [notifyWrongState(message)])
    }
    return T.make(
      {
        ...state,
        productListData: {
          ...state.productListData,
          maybeSelectedProducts: Opt.none(),
        },
      },
      [],
    )
  },

  Home_DeleteFailed: (message) => (state) => {
    if (state.productListData.activity !== 'deleting') {
      return T.make(state, [notifyWrongState(message)])
    }
    return T.make(
      {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'idle' as const,
        },
      },
      [],
    )
  },

  Home_DeleteSucceeded: (message) => (state) => {
    if (state.productListData.activity !== 'deleting') {
      return T.make(state, [notifyWrongState(message)])
    }
    return T.make(
      {
        ...state,
        productListData: {
          ...state.productListData,
          activity: 'idle' as const,
        },
      },
      [],
    )
  },

  Home_FetchListFailed: (message) => (state) => {
    if (state.versions.manualFetcher !== message.version) {
      return T.make(state, [notifyStale(message)])
    }
    if (state.productListData.activity !== 'fetching') {
      return T.make(state, [notifyWrongState(message)])
    }
    return updateFetchListFailed(state)
  },

  Home_FetchListSucceeded: (message) => (state) => {
    if (state.versions.manualFetcher !== message.version) {
      return T.make(state, [notifyStale(message)])
    }
    if (state.productListData.activity !== 'fetching') {
      return T.make(state, [notifyWrongState(message)])
    }
    return updateFetchListSucceeded(state, message.response.maybeProducts)
  },

  Home_StartDeleteAndRefresh: (message) => (state) => {
    if (
      state.productListData._tag !== 'Available'
      || state.productListData.activity === 'fetching'
      || state.productListData.activity === 'deleting'
    ) {
      return T.make(state, [notifyWrongState(message)])
    }
    if (Opt.isNone(state.productListData.maybeSelectedProducts)) {
      return T.make(state, [notifyWrongState(message)])
    }
    return T.make(
      {
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
      [
        deleteProducts({
          ids: state.productListData.maybeSelectedProducts.value,
        }),
      ],
    )
  },

  Home_StartFetchList: (message) => (state) => {
    if (
      state.productListData.activity !== 'idle'
    ) {
      return T.make(state, [notifyWrongState(message)])
    }
    const nextFetchVersion = FetchListVersion.increment(
      state.versions.manualFetcher,
    )
    return T.make(
      {
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
      T.make(fetchList(nextFetchVersion)),
    )
  },

  Home_ToggleItem: (message) => (state) => {
    if (
      state.productListData._tag !== 'Available'
      || (state.productListData.activity !== 'idle')
    ) {
      return T.make(state, [notifyWrongState(message)])
    }
    return T.make(
      {
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
      [],
    )
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
        Stream.map((response) =>
          response._tag === 'Succeeded'
            ? InternalMessage.Home_GoodListReceived({ response })
            : InternalMessage.Home_BadListReceived()
        ),
      ),
    ],
    [
      'activity',
      Effect.service(ViewportEvents).pipe(
        Effect.map((a) => a.activity$),
        Stream.unwrap,
        Stream.map((isInteracting) => InternalMessage.Home_Interacting({ state: isInteracting })),
      ),
    ],
    [
      'isWindowTop',
      Effect.service(ViewportEvents).pipe(
        Effect.map((a) => a.isAtTop$),
        Stream.unwrap,
        Stream.map((isAtTop) => InternalMessage.Home_WindowAtTop({ state: isAtTop })),
      ),
    ],
    [
      'isWindowCloseToTop',
      Effect.service(ViewportEvents).pipe(
        Effect.map((a) => a.isCloseToTop$),
        Stream.unwrap,
        Stream.map((isCloseToTop) => InternalMessage.Home_WindowCloseToTop({ state: isCloseToTop })),
      ),
    ],
  )

  return map
}

export const init: StateManager.Step<State, InternalMessage, UseCases | ViewportCommands> = T.make(
  {
    isWindowCloseToTop: false,
    isMenuOpen: false,
    isWindowAtTop: true,
    isInteracting: false,
    productListData: { _tag: 'Initial', activity: 'idle' },
    versions: {
      manualFetcher: FetchListVersion.make(0n),
    },
  },
  [Effect.succeed(InternalMessage.Home_StartFetchList())],
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
  return Match.valueTags(result, {
    Failed: (response) => InternalMessage.Home_FetchListFailed({ response, version }),
    Succeeded: (response) => InternalMessage.Home_FetchListSucceeded({ response, version }),
  })
})

const deleteProducts = Effect.fn(function*(
  params: Parameters<UC.DeleteProductsByIds.DeleteProductsByIds['Service']>[0],
) {
  const deleteProducts = yield* UC.DeleteProductsByIds.DeleteProductsByIds
  {
    const result = yield* deleteProducts(params)
    if (result._tag === 'Failed') {
      return InternalMessage.Home_DeleteFailed()
    }
    return InternalMessage.Home_DeleteSucceeded()
  }
})
