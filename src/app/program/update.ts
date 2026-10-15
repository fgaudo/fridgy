import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type * as Engine from '@/libs/elm/engine.ts'
import * as Program from '@/libs/elm/program.ts'
import * as Home from '../pages/home/program.ts'
import { InternalMessage } from './messages.ts'
import type { State } from './state.ts'

export type Deps = Home.Deps

export const home = Program.embed(Home.program, {
  key: 'Home',
  wrap: (message) => InternalMessage.GotHomeMsg({ message }),
  get: (state: State) => Opt.some(state.home),
  set: (state, home) => ({ ...state, home }),
})

export const update: Engine.Update<State, InternalMessage, Deps> = Match.typeTags<
  InternalMessage,
  (state: State) => Engine.Transition<State, InternalMessage, Deps>
>()({
  GotHomeMsg: ({ message }) => home.update(message),
})

export const init: Engine.Step<State, InternalMessage, Deps> = (() => {
  const homeStep = home.init(Home.program.init)
  return { state: { home: homeStep.state }, commands: homeStep.commands ?? [] }
})()
