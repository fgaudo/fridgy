// The development variant of the JSX runtime, which some tools ask for (e.g. a
// build without `NODE_ENV=production`): it is the same runtime.
import type { FunctionComponent, Key, VNode } from 'snabbdom'
import { jsx } from './jsx-runtime.ts'

export { Fragment } from './jsx-runtime.ts'
export type { JSX } from './jsx-runtime.ts'

export const jsxDEV = (tag: string | FunctionComponent, props: Parameters<typeof jsx>[1], key?: Key): VNode =>
  jsx(tag, props, key)
