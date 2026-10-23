import * as Layer from 'effect/Layer'
import * as LicensesBundled from './licenses/licenses.bundled.ts'
import * as VersionBundled from './version/version.bundled.ts'

export const layer = Layer.mergeAll(LicensesBundled.layer, VersionBundled.layer)
