import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import * as Home from '../pages/home/program.ts'
import type { State } from './state.ts'

export type Model = Readonly<{
  appIsReady: boolean
  currentPage: Data.TaggedEnum<{
    Home: { model: Home.Model }
    AddProduct: { model: object }
  }>
}>

const PageModel = Data.taggedEnum<Model['currentPage']>()

export const makeModel = (state: State): Model => {
  const currentPage = Chunk.headNonEmpty(state.navigationStack)
  return {
    appIsReady: state.appIsReady,
    currentPage: currentPage._tag === 'Home'
      ? PageModel.Home({ model: Home.program.makeModel(state.page.Home) })
      : PageModel.AddProduct({ model: {} }),
  }
}
