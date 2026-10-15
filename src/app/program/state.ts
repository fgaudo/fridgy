import type * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import type * as Home from '../pages/home/program.ts'

export type Route = Data.TaggedEnum<{
  Home: object
  AddProduct: object
}>

export const Route = Data.taggedEnum<Route>()

export type State = Readonly<{
  appIsReady: boolean
  navigationStack: Chunk.NonEmptyChunk<Route>
  page: {
    Home: Home.State
    AddProduct: object
  }
}>
