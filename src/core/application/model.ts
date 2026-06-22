import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import type { Route } from '@/core/application/transition.ts'
import * as Home from '../../feature/home/application/model.ts'

export type Model = {
  appIsReady: boolean
  currentPage: Data.TaggedEnum<{
    Home: { model: Home.Model; route: 'default' | 'add' }
    AddProduct: { model: object }
  }>
}

export type State = Readonly<{
  appIsReady: boolean
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
    }
  }
  return {
    appIsReady: state.appIsReady,
    currentPage: PageModel.AddProduct({ model: {} }),
  }
}
