// Root view. In development this module is built as its own entrypoint
// (view.js) and re-imported on every change, so it must stay pure: it may only
// import views, message constructors and generic helpers.
import * as Match from 'effect/Match'
import type { View } from '@/libs/tea-snabbdom/tea-snabbdom.ts'
import { mapDispatch } from '@fgaudo/effect-tea'
import * as About from './pages/about/view.tsx'
import * as Home from './pages/home/view.tsx'
import { Message } from './program/messages.ts'
import type { Model } from './program/model.ts'

export const view: View<Model, Message> = (model, dispatch) =>
  Match.valueTags(model.page, {
    Home: ({ model }) => Home.view(model, mapDispatch(dispatch, (message) => Message.GotHomeMsg({ message }))),
    About: ({ model }) => About.view(model, mapDispatch(dispatch, (message) => Message.GotAboutMsg({ message }))),
  })
