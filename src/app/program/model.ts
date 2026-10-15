import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as About from '../pages/about/program.ts'
import * as Home from '../pages/home/program.ts'
import { type State, top } from './state.ts'

export type Model = Readonly<{
  /** The shown page. */
  page: Data.TaggedEnum<{
    Home: { model: Home.Model }
    About: { model: About.Model }
  }>
}>

const PageModel = Data.taggedEnum<Model['page']>()

export const makeModel = (state: State): Model => ({
  page: Match.valueTags(top(state), {
    Home: ({ state }) => PageModel.Home({ model: Home.program.makeModel(state) }),
    About: ({ state }) => PageModel.About({ model: About.program.makeModel(state) }),
  }),
})
