// Root view. In development this module is built as its own entrypoint
// (view.js) and re-imported on every change, so it must stay pure: it may import
// views, the programs' types and generic helpers, never layers or adapters.
import * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import type { View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import * as About from './pages/about/view.tsx'
import * as Home from './pages/home/view.tsx'
import type { Message, Model } from './program.ts'

export const view: View<Model, Message> = (model, dispatch) =>
  Match.valueTags(model.page, {
    Home: ({ model }) => Home.view(model, Tea.dispatchTo(dispatch, 'Home')),
    About: ({ model }) => About.view(model, Tea.dispatchTo(dispatch, 'About')),
  })
