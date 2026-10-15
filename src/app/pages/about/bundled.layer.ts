import * as Layer from 'effect/Layer'
import * as LicensesBundled from './adapters/licenses/bundled.ts'
import * as SayingsBundled from './adapters/sayings/bundled.ts'

// Licenses and sayings ship with the app: every setup uses this layer.
export const layer = Layer.mergeAll(LicensesBundled.layer, SayingsBundled.layer)
