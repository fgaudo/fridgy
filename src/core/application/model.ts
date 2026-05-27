import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'
import type { Route } from '@/app/core/transition.ts'
import * as Home from '../../feature/home/application/model.ts'

export type Model = {
  appIsReady: boolean
  toast: {
    key: string
    maybeText: Opt.Option<string>
  }
  currentPage: Data.TaggedEnum<{
    Home: { model: Home.Model; route: 'default' | 'add' }
    AddProduct: { model: object }
  }>
}

export type State = Readonly<{
  appIsReady: boolean
  toast: Readonly<{
    version: bigint
    maybeText: Opt.Option<string>
  }>
  navigationStack: Chunk.NonEmptyChunk<Route>
  page: {
    Home: Home.State
    AddProduct: object
  }
}>

const PageModel = Data.taggedEnum<Model['currentPage']>()

export const makeModel = (state: State): Model => {
  const currentPage = Chunk.headNonEmpty(state.navigationStack)
  if (currentPage._tag === 'Home') {
    return {
      appIsReady: state.appIsReady,
      currentPage: PageModel.Home({
        model: Home.makeModel(state.page.Home),
        route: currentPage.route,
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
