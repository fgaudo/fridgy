import * as Layer from 'effect/Layer'
import * as Products from './children/products/layer.ts'
import * as ViewportFixed from './services/viewport/viewport.fixed.ts'

export const layer = Layer.mergeAll(Products.layer, ViewportFixed.layer)
