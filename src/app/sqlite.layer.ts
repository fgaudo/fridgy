import * as Layer from 'effect/Layer'
import * as ShellCapacitor from './adapters/shell/capacitor.ts'
import * as Home from './pages/home/sqlite.layer.ts'

/** Every port of the app and its pages, backed by sqlite and Capacitor. */
export const layer = Layer.mergeAll(ShellCapacitor.layer, Home.layer)
