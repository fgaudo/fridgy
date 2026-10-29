import * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import { Fragment, type ReactNode } from 'react'
import type { View } from '#libs/tea-react/tea-react.ts'
import * as About from './children/about/view.tsx'
import * as AddProducts from './children/add-products/view.tsx'
import * as EditProduct from './children/edit-product/view.tsx'
import * as Home from './children/home/view.tsx'
import type { Message, Model } from './program.ts'

// Keyed by the page's name: React reuses an element of the same type in the same place, and a page drawn in
// another's would keep its native views, and the text of their fields.
const page = (name: string, drawn: ReactNode) => <Fragment key={name}>{drawn}</Fragment>

/** The page on top, alone: a page is drawn whole, over nothing. */
export const view: View<Model, Message> = (model, dispatch) =>
  Match.valueTags(model.page, {
    Home: ({ model }) => page('Home', Home.view(model, Tea.dispatchTo(dispatch, 'Home'))),
    AddProducts: ({ model }) => page('AddProducts', AddProducts.view(model, Tea.dispatchTo(dispatch, 'AddProducts'))),
    EditProduct: ({ model }) => page('EditProduct', EditProduct.view(model, Tea.dispatchTo(dispatch, 'EditProduct'))),
    About: ({ model }) => page('About', About.view(model, Tea.dispatchTo(dispatch, 'About'))),
  })
