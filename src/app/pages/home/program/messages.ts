import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Result from 'effect/Result'
import type { StoredProduct } from '../ports/products.ts'
import type { OperationId } from './state.ts'

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
  TimeChanged: { now: DateTime.Utc }
  ProductsChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, void> }
}>

export const Message = Data.taggedEnum<Message>()

export type InternalMessage =
  | Message
  | Data.TaggedEnum<{
    AddProductCompleted: { operation: OperationId; succeeded: boolean }
    DeleteProductsCompleted: { operation: OperationId; succeeded: boolean }
  }>

export const InternalMessage = Data.taggedEnum<InternalMessage>()
