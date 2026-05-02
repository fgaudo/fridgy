import * as Data from 'effect/Data'
import type * as UC from '@/app/use-cases/index.ts'

export type Message = Data.TaggedEnum<{
  FetchProducts: object
  DeleteProducts: object
  ToggleItem: { id: string }
  ClearSelected: object
  ToggleMenu: object
}>

export type InternalMessage =
  | Message
  | Data.TaggedEnum<{
    ViewportAtTopChanged: { isAtTop: boolean }
    ViewportCloseToTopChanged: { isCloseToTop: boolean }
    InteractionChanged: { isInteracting: boolean }
    FetchProductsCompleted: {
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
