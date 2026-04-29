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
    response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
  }
  FetchListSucceeded: {
    version: bigint
    response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
  }
  FetchListTick: { version: bigint }
  FetchListTickSucceeded: {
    version: bigint
    response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
  }
  FetchListTickFailed: {
    version: bigint
    response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
  }
  DeleteAndRefreshSucceeded: {
    response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
  }
  DeleteAndRefreshFailed: {
    response: Data.TaggedEnum.Value<UC.DeleteProductsByIds.Response, 'Failed'>
  }
  DeleteSucceededButRefreshFailed: {
    response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
  }
}
