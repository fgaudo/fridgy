import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Result from 'effect/Result'
import type { StoredProduct } from '../ports/products.ts'
import type { OperationId } from './state.ts'

/** What the parent may send to the page: its public, inbound API. */
export type ExternalMessage = Data.TaggedEnum<{
  /** Android's back button, while the page is shown. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

/** Everything the page handles: the public messages, and the ones it generates itself. */
export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    // From the view.
    DeleteStarted: object
    ItemToggled: { id: string }
    ClearSelected: object
    MenuToggled: object
    AddProductToggled: object
    AddProductStarted: object
    NameChanged: { name: string }
    ExpirationDateChanged: { expiration: string | number }
    InfoRequested: object
    // From subscriptions.
    ViewportAtTopChanged: { isAtTop: boolean }
    ViewportCloseToTopChanged: { isCloseToTop: boolean }
    InteractionChanged: { isInteracting: boolean }
    TimeChanged: { now: DateTime.Utc }
    ProductsChanged: { result: Result.Result<ReadonlyArray<StoredProduct>, void> }
    // From commands.
    AddProductCompleted: { operation: OperationId; succeeded: boolean }
    DeleteProductsCompleted: { operation: OperationId; succeeded: boolean }
  }>

export const Message = Data.taggedEnum<Message>()

/** What the page asks of its parent (the "OutMsg" pattern). */
export type Event = Data.TaggedEnum<{
  InfoRequested: object
  /** Nothing left to close: the page should be left. */
  LeaveRequested: object
}>

export const Event = Data.taggedEnum<Event>()
