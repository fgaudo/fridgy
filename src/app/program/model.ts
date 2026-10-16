import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as About from '#app/pages/about/program.ts'
import * as Home from '#app/pages/home/program.ts'
import { top } from './navigation.ts'
import type { State } from './state.ts'

export type Model = Readonly<{
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
