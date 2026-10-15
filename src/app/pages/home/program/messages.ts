import type * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type { UnvalidatedSnapshot } from '../domain/product.ts'
import type { OperationId } from './state.ts'
import type * as UnitInterval from '@/libs/numbers/unit-interval.ts'

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
  AddProductCompleted: { operation: OperationId; succeeded: boolean }
  ProductsChanged: {
    result: Result.Result<
      ReadonlyArray<
        UnvalidatedSnapshot & {
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
      validation: OperationId
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
    DeleteProductsCompleted: { operation: OperationId; succeeded: boolean }
    NoOp: object
  }>

export const InternalMessage = Data.taggedEnum<InternalMessage>()
