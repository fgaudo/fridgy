import type * as UC from '@/app/use-cases/index.ts'

export type Message = {
  FetchProducts: object
  DeleteProducts: object
  ToggleItem: { id: string }
  ClearSelected: object
  ToggleMenu: object
}

export type InternalMessage = {
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
}
