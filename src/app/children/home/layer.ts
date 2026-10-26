import * as Layer from 'effect/Layer'
import * as Products from './children/products/layer.ts'
import * as ViewportBrowser from './services/viewport/viewport.browser.ts'

export const layer = Layer.mergeAll(Products.layer, ViewportBrowser.layer)
