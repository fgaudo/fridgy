import * as Chunk from 'effect/Chunk'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as Engine from '@/libs/elm/engine.ts'
import * as Program from '@/libs/elm/program.ts'
import * as Home from '../pages/home/program.ts'
import type { Shell } from '../ports/shell.ts'
import { hideSplashScreen } from './commands.ts'
import { InternalMessage } from './messages.ts'
import { Route, type State } from './state.ts'

export type Deps = Home.Deps | Shell

export const home = Program.embed(Home.program, {
  key: 'Home',
  wrap: (message) => InternalMessage.GotHomeMsg({ message }),
  get: (state: State) =>
    Chunk.headNonEmpty(state.navigationStack)._tag === 'Home'
      ? Opt.some(state.page.Home)
      : Opt.none(),
  set: (state, Home) => ({ ...state, page: { ...state.page, Home } }),
})

export const update: Engine.Update<State, InternalMessage, Deps> = Match.typeTags<
  InternalMessage,
  (state: State) => Engine.Step<State, InternalMessage, Deps>
>()({
  GotHomeMsg: ({ message }) => home.update(message),

  HideSplashScreenRequested: () => (state) => ({
    state,
    commands: [hideSplashScreen],
  }),

  NoOp: () => (state) => ({ state }),
})

export const init: Engine.Step<State, InternalMessage, Deps> = (() => {
  const homeStep = home.init(Home.program.init)
  return {
    state: {
      appIsReady: true,
      navigationStack: Chunk.make(Route.Home()),
      page: { AddProduct: {}, Home: homeStep.state },
    },
    commands: homeStep.commands ?? [],
  }
})()
