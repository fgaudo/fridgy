import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Result from 'effect/Result'
import type { StoredProduct } from '../ports/product-list.ts'

export type ExternalMessage = Data.TaggedEnum<{
  /** Android's back button, while the page is shown. */
  BackPressed: object
}>

export const ExternalMessage = Data.taggedEnum<ExternalMessage>()

export type Message =
  | ExternalMessage
  | Data.TaggedEnum<{
    // From the view.
    DeleteStarted: object
    ItemSelected: { id: string }
    ItemDeselected: { id: string }
    ClearSelected: object
    MenuOpened: object
    MenuClosed: object
    AddProductOpened: object
    AddProductClosed: object
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
    AddProductCompleted: { succeeded: boolean }
    DeleteProductsCompleted: { succeeded: boolean }
  }>

export const Message = Data.taggedEnum<Message>()

export type Event = Data.TaggedEnum<{
  InfoRequested: object
  /** Nothing left to close: the page should be left. */
  LeaveRequested: object
}>

export const Event = Data.taggedEnum<Event>()
