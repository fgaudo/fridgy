// The JSX runtime for views (`jsxImportSource` in tsconfig.json): TSX compiles
// to calls of `jsx`/`jsxs` from this module, which build snabbdom vnodes with
// snabbdom's own `jsx`.
//
// Snabbdom types an element's attributes as `VNodeData`, whose index signature
// accepts anything, so a misplaced attribute (e.g. `className` outside `props`)
// would be silently ignored at runtime. Here only the snabbdom modules are
// accepted, and `props` only takes the element's own primitive properties.
import {
  type Attrs,
  type Classes,
  type Dataset,
  Fragment,
  type FunctionComponent,
  type Hooks,
  jsx as snabbdomJsx,
  type JsxVNodeChild,
  type Key,
  type On,
  type VNode,
  type VNodeStyle,
} from 'snabbdom'

/** The properties of `Element` that snabbdom's props module can set. */
type ElementProps<Element> = {
  [P in keyof Element as Element[P] extends string | number | boolean | null | undefined ? P : never]?: Element[P]
}

/** What a JSX element accepts: the snabbdom modules, and nothing else. */
export type Attributes<Element = HTMLElement> = Readonly<{
  key?: Key
  props?: ElementProps<Element>
  attrs?: Attrs
  class?: Classes
  style?: VNodeStyle
  dataset?: Dataset
  on?: On
  hook?: Hooks
}>

/** What may appear between tags: nodes, text, nothing (`false`, `null`, `undefined`), or lists of these. */
export type Children = JsxVNodeChild | ReadonlyArray<Children>

type RuntimeProps = Attributes & Readonly<{ children?: Children }>

/**
 * The automatic runtime passes the children inside the props and the key apart;
 * snabbdom's `jsx` takes the key in the data and the children as arguments.
 */
export const jsx = (tag: string | FunctionComponent, { children, ...data }: RuntimeProps, key?: Key): VNode =>
  // Snabbdom's `jsx` flattens nested lists and drops empty children; its types only declare one level.
  snabbdomJsx(tag, key === undefined ? data : { ...data, key }, children as JsxVNodeChild)

/** Called for elements with several static children: the same as `jsx`. */
export const jsxs = jsx

export { Fragment }

export declare namespace JSX {
  type Element = VNode
  type IntrinsicElements = {
    [Tag in keyof HTMLElementTagNameMap]: Attributes<HTMLElementTagNameMap[Tag]> & Readonly<{ children?: Children }>
  }
  type ElementChildrenAttribute = { children: unknown }
}
