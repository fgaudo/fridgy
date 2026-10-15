// Root view. In development this module is built as its own entrypoint
// (view.js) and re-imported on every change, so it must stay pure: it may only
// import views, message constructors and generic helpers.
import * as Match from 'effect/Match'
import { mapDispatch, type View } from '@/libs/elm/view.ts'
import * as About from './pages/about/view.ts'
import * as Home from './pages/home/view.ts'
import { InternalMessage } from './program/messages.ts'
import type { Model } from './program/model.ts'

export const view: View<Model, InternalMessage> = (model, dispatch) =>
  Match.valueTags(model.page, {
    Home: ({ model }) => Home.view(model, mapDispatch(dispatch, (message) => InternalMessage.GotHomeMsg({ message }))),
    About: ({ model }) =>
      About.view(model, mapDispatch(dispatch, (message) => InternalMessage.GotAboutMsg({ message }))),
  })
