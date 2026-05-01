import type * as Data from 'effect/Data'

import type * as UC from '@/app/use-cases/index.ts'

export type Message = {
  StartFetchList: object
  StartDeleteAndRefresh: object
  ToggleItem: { id: string }
  ClearSelected: object
  ToggleMenu: object
}

export type InternalMessage = {
  WindowAtTop: { state: boolean }
  WindowCloseToTop: { state: boolean }
  Interacting: { state: boolean }
  FetchListFailed: {
    version: bigint
    response: Data.TaggedEnum.Value<UC.Products.Response, 'Failed'>
  }
  FetchListSucceeded: {
    version: bigint
    response: Data.TaggedEnum.Value<UC.Products.Response, 'Succeeded'>
  }
  GoodListReceived: {
    response: Data.TaggedEnum.Value<UC.Products.Response, 'Succeeded'>
  }
  BadListReceived: object
  DeleteSucceeded: object
  DeleteFailed: object
}
