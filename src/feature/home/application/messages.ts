import * as Data from 'effect/Data'
import type * as UC from '@/app/use-cases/index.ts'

export type Message = Data.TaggedEnum<{
  FetchStarted: object
  DeleteStarted: object
  ItemToggled: { id: string }
  ClearSelected: object
  MenuToggled: object
  AddProductClosed: object
  AddProductOpened: object
  AddProductStarted: object
}>

export type InternalMessage =
  | Message
  | Data.TaggedEnum<{
    AddProductCompleted: object
    NameChanged: { name: string }
    ExpirationDateChanged: { expiration: string | number }
    ViewportAtTopChanged: { isAtTop: boolean }
    ViewportCloseToTopChanged: { isCloseToTop: boolean }
    InteractionChanged: { isInteracting: boolean }
    FetchCompleted: {
      version: bigint
      response: UC.Products.Response
    }
    ProductsChanged: {
      response: UC.Products.Response
    }
    DeleteProductsCompleted: { response: UC.DeleteProductsByIds.Response }
    NoOp: object
  }>

export const InternalMessage = Data.taggedEnum<InternalMessage>()
