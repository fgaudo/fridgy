import { fromEventListenerWindow } from '@effect/platform-browser/BrowserStream'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { Events } from '@/feature/home/application/inbound'
import { Dispatcher, Message } from '@/feature/home/application/messages.ts'
import { ProductExpirationSchema, ProductSchema } from '@/infra/sql/schema.ts'
import * as SqlHelper from '@/infra/sql/sql-helper.ts'

const mapToDto = Effect.fn(
  function*(product: Effect.Success<SqlHelper.SqlHelper['Service']['getProducts']>[0]) {
    return {
      ...product,
      maybeId: Opt.map(product.maybeId, (id) => id.toString(10)),
    } as const
  },
)

export const inbound = Layer.unwrap(Effect.gen(function*() {
  const pubsub = yield* PubSub.unbounded<
    Message
  >()
  const { getProducts } = yield* SqlHelper.SqlHelper
  const sql = yield* SqlClient.SqlClient
  const reactive = sql.reactive(
    [ProductSchema.table, ProductExpirationSchema.table],
    getProducts.pipe(Effect.option),
  )
  const scroll$ = fromEventListenerWindow('scroll')
  const scrollEnd$ = fromEventListenerWindow('scrollend')
  return Layer.mergeAll(
    Layer.succeed(
      Events,
      Stream.mergeAll([
        Stream.merge(
          scroll$.pipe(Stream.map(() => true)),
          scrollEnd$.pipe(Stream.map(() => false)),
        ).pipe(
          Stream.changes,
          Stream.map((isInteracting) => Message.InteractionChanged({ isInteracting })),
        ),
        Stream.concat(Stream.make(undefined), scroll$).pipe(
          Stream.mapEffect(() =>
            Effect.sync(
              () => Message.ViewportAtTopChanged({ isAtTop: window.scrollY === 0 }),
            )
          ),
          Stream.changes,
        ),
        Stream.concat(Stream.make(undefined), scroll$).pipe(
          Stream.mapEffect(() =>
            Effect.sync(
              () => Message.ViewportCloseToTopChanged({ isCloseToTop: window.scrollY <= 30 }),
            )
          ),
          Stream.changes,
        ),
        reactive.pipe(
          Stream.buffer({ capacity: 1, strategy: 'sliding' }),
          Stream.mapEffect(Effect.fn(function*(maybeProducts) {
            if (Opt.isNone(maybeProducts)) {
              return Message.ProductsChanged({ result: Result.fail(undefined) })
            }
            return yield* pipe(
              maybeProducts.value,
              Arr.map(mapToDto),
              Effect.all,
              Effect.result,
              Effect.map(
                Result.match({
                  onFailure: () => Message.ProductsChanged({ result: Result.fail(undefined) }),
                  onSuccess: (result) => Message.ProductsChanged({ result: Result.succeed(result) }),
                }),
              ),
            )
          })),
        ),
        Stream.fromPubSub(pubsub),
      ], { concurrency: 'unbounded' }),
    ),
    Layer.succeed(Dispatcher, PubSub.publishUnsafe),
  )
}))
