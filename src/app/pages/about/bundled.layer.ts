import * as Layer from 'effect/Layer'
import * as LicensesBundled from './adapters/licenses/bundled.ts'
import * as VersionBundled from './adapters/version/bundled.ts'

// Licenses and the version ship with the app: every setup uses this layer.
export const layer = Layer.mergeAll(LicensesBundled.layer, VersionBundled.layer)
