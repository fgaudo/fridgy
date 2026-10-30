import * as Context from 'effect/Context'
import type * as Source from '#libs/source/source.ts'

/**
 * How far the on-screen keyboard covers the window's bottom, in dp, the navigation bar it hides included: what a
 * page drawn edge to edge keeps clear of, since such a window is never resized. 0 while the keyboard is down. It is
 * where the keyboard is going, told as it starts to move: a page keeps clear of it until it has left. The
 * pages observe it directly: a keyboard has no shape for a page to give it.
 */
export class Keyboard extends Context.Service<
  Keyboard,
  {
    readonly insets: Source.Source<number, never>
  }
>()('d0aa9757a23a2bfb') {}
