// Root view. In development this module is built as its own entrypoint
// (view.js) and re-imported on every change, so it must stay pure: it may only
// import views, message constructors and generic helpers.
import { mapDispatch, type View } from '@/libs/elm/view.ts'
import * as Home from './pages/home/view.ts'
import { InternalMessage } from './program/messages.ts'
import type { Model } from './program/model.ts'

export const view: View<Model, InternalMessage> = (model, dispatch) =>
  Home.view(model.home, mapDispatch(dispatch, (message) => InternalMessage.GotHomeMsg({ message })))
