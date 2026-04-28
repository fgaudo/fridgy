import * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'

import * as Home from './home/model.ts'

export type Model = {
  appIsReady: boolean
  toast: {
    key: string
    maybeText: Opt.Option<string>
  }
  currentPage: Data.TaggedEnum<{
    Home: { model: Home.Model }
    AddProduct: { model: object }
  }>
}

export type State = Readonly<{
  appIsReady: boolean
  toast: Readonly<{
    version: bigint
    maybeText: Opt.Option<string>
  }>
  currentPage: 'Home' | 'AddProduct'
  page: {
    Home: Home.State
    AddProduct: object
  }
}>

const PageModel = Data.taggedEnum<Model['currentPage']>()

export const makeModel = (state: State): Model => {
  if (state.currentPage === 'Home') {
    return {
      appIsReady: state.appIsReady,
      currentPage: PageModel.Home({
        model: Home.makeModel(state.page.Home),
      }),
      toast: {
        key: state.toast.version.toString(16),
        maybeText: state.toast.maybeText,
      },
    }
  }
  return {
    appIsReady: state.appIsReady,
    currentPage: PageModel.AddProduct({ model: {} }),
    toast: {
      key: state.toast.version.toString(16),
      maybeText: state.toast.maybeText,
    },
  }
}
