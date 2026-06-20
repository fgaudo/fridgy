import type * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'
import type * as UnitInterval from '@/shared/unit-interval.ts'

export type Message = Data.TaggedEnum<{
  DeleteStarted: { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
  ItemToggled: { id: string }
  ClearSelected: object
  MenuToggled: object
  AddProductToggled: object
  AddProductStarted: {
    maybeName: Opt.Option<string>
    maybeExpirationDate: Opt.Option<DateTime.Utc>
  }
  ViewportAtTopChanged: { isAtTop: boolean }
  ViewportCloseToTopChanged: { isCloseToTop: boolean }
  InteractionChanged: { isInteracting: boolean }
  NameChanged: { name: string }
  ExpirationDateChanged: { expiration: string | number }
  AddProductCompleted: object
  ProductsChanged: {
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

export const Message = Data.taggedEnum<Message>()
