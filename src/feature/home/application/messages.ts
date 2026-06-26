import type * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type { ProductInput } from '@/feature/home/domain/product.ts'
import type * as NonEmptyHashSet from '@/libs/non-empty-hash-set.ts'
import type * as UnitInterval from '@/libs/unit-interval.ts'

export class Dispatcher extends Context.Service<
  Dispatcher,
  (m: Message) => void
>()('ae85bebf0c1014b0') {}

export type Message = Data.TaggedEnum<{
  DeleteStarted: object
  ItemToggled: { id: string }
  ClearSelected: object
  MenuToggled: object
  AddProductToggled: object
  AddProductStarted: object
  ViewportAtTopChanged: { isAtTop: boolean }
  ViewportCloseToTopChanged: { isCloseToTop: boolean }
  InteractionChanged: { isInteracting: boolean }
  NameChanged: { name: string }
  ExpirationDateChanged: { expiration: string | number }
  AddProductCompleted: object
  ProductsChanged: {
    result: Result.Result<
      ReadonlyArray<
        ProductInput & {
          maybeId: Opt.Option<string>
        }
      >,
      void
    >
  }
}>

export const Message = Data.taggedEnum<Message>()

export type InternalMessage =
  | Message
  | Data.TaggedEnum<{
    ProductsValidated: {
      result: Result.Result<
        Opt.Option<
          Arr.NonEmptyReadonlyArray<
            Data.TaggedEnum<{
              Invalid: {
                maybeName: Opt.Option<string>
                maybeId: Opt.Option<string>
              }
              Valid: {
                id: string
                name: string
                status: Data.TaggedEnum<{
                  Everlasting: object
                  Stale: {
                    expirationDate: DateTime.Utc
                  }
                  Fresh: {
                    freshnessRatio: UnitInterval.UnitInterval
                    timeLeft: Duration.Duration
                    expirationDate: DateTime.Utc
                  }
                }>
              }
            }>
          >
        >,
        void
      >
    }
    DeleteProductsCompleted: object
    NoOp: object
  }>

export const InternalMessage = Data.taggedEnum<InternalMessage>()
