import * as Home from '../pages/home/program.ts'
import type { State } from './state.ts'

export type Model = Readonly<{
  home: Home.Model
}>

export const makeModel = (state: State): Model => ({
  home: Home.program.makeModel(state.home),
})
