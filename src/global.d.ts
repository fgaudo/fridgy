import type * as snabbdom from 'snabbdom'

declare global {
	declare module '*.css'

	namespace JSX {
		type Element = snabbdom.VNode

		interface IntrinsicElements extends snabbdom.jsx.JSX.IntrinsicElements {}
	}
}
