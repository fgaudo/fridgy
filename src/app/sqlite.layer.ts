import * as Layer from 'effect/Layer'
import * as ShellCapacitor from './adapters/shell/capacitor.ts'
import * as About from './pages/about/bundled.layer.ts'
import * as Home from './pages/home/sqlite.layer.ts'

export const layer = Layer.mergeAll(ShellCapacitor.layer, Home.layer, About.layer)
