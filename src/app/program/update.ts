import * as Match from 'effect/Match'
import type * as Tea from '@fgaudo/effect-tea'
import * as About from '../pages/about/program.ts'
import * as Home from '../pages/home/program.ts'
import type { Message } from './messages.ts'
import { about, type Deps, home, top } from './navigation.ts'
import { Page, type State } from './state.ts'

export const update: Tea.Update<State, Message, Deps> = Match.typeTags<
  Message,
  (state: State) => Tea.Transition<State, Message, Deps>
>()({
  GotHomeMsg: ({ message }) => home.update(message),
  GotAboutMsg: ({ message }) => about.update(message),
  // The shown page decides: it closes what it has open, or asks to be left.
  BackRequested: () => (state) =>
    Match.valueTags(top(state), {
      Home: () => home.update(Home.ExternalMessage.BackPressed())(state),
      About: () => about.update(About.ExternalMessage.BackPressed())(state),
    }),
})

export const init: Tea.Step<State, Message, Deps> = (() => {
  const homeStep = home.init(Home.program.init)
  return { state: { stack: [Page.Home({ state: homeStep.state })] }, commands: homeStep.commands ?? [] }
})()
