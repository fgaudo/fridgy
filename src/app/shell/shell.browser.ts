import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import * as Source from '#libs/source/source.ts'
import { Shell } from './shell.ts'

// A browser has no back button to listen to, only a history to go back in. While the button is observed, an
// entry of the app's own (the trap) sits on top of the page's: going back only leaves the trap, which is set
// again at once. Setting it drops the entries ahead, so the browser's forward never lands on it.
const trap = { backTrap: true }

const isTrap = (state: unknown) => typeof state === 'object' && state !== null && 'backTrap' in state

export const layer = Layer.succeed(Shell, {
  backButton: Source.fromStream(Stream.callback<void>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const onPopState = (event: PopStateEvent) => {
          if (isTrap(event.state)) return
          window.history.pushState(trap, '')
          Queue.offerUnsafe(queue, undefined)
        }
        window.history.pushState(trap, '')
        window.addEventListener('popstate', onPopState)
        return onPopState
      }),
      // The trap stays in the history: going back once more passes it. Removing it (`history.back()`, which
      // is asynchronous) could take away the trap of an observation started right after.
      (onPopState) => Effect.sync(() => window.removeEventListener('popstate', onPopState)),
    )
  )),
  // A page cannot close its tab: it goes back past the trap, to what the tab showed before the app.
  exitApp: Effect.sync(() => window.history.go(-2)),
})
