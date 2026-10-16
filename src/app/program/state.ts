import type * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import type * as About from '#app/pages/about/program.ts'
import type * as Home from '#app/pages/home/program.ts'

export type Page = Data.TaggedEnum<{
  Home: Readonly<{ state: Home.State }>
  About: Readonly<{ state: About.State }>
}>

export const Page = Data.taggedEnum<Page>()

/** The pages the user went through: the last one is shown. Home is always the first. */
export type State = Readonly<{
  stack: Arr.NonEmptyReadonlyArray<Page>
}>
