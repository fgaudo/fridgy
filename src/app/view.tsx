// Root view. In development this module is built as its own entrypoint
// (view.js) and re-imported on every change, so it must stay pure: it may import
// views, the programs' types and generic helpers, never layers or adapters.
import * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import type { View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import * as About from './children/about/view.tsx'
import * as AddProducts from './children/add-products/view.tsx'
import * as Home from './children/home/view.tsx'
import type { Message, Model } from './program.ts'

// Each page is drawn in an element keyed by its name, so that snabbdom never patches one page's elements into
// another's: its props module never removes a property, and Home's root would leave its classes (e.g.
// `scroll-locked`, from the menu that opened About) to the page drawn in its place.
export const view: View<Model, Message> = (model, dispatch) => (
  <div key={model.page._tag}>
    {Match.valueTags(model.page, {
      Home: ({ model }) => Home.view(model, Tea.dispatchTo(dispatch, 'Home')),
      AddProducts: ({ model }) => AddProducts.view(model, Tea.dispatchTo(dispatch, 'AddProducts')),
      About: ({ model }) => About.view(model, Tea.dispatchTo(dispatch, 'About')),
    })}
  </div>
)
