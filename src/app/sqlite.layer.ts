import * as Layer from 'effect/Layer'
import * as Home from './pages/home/sqlite.layer.ts'

export const layer = Layer.mergeAll(Home.layer)
