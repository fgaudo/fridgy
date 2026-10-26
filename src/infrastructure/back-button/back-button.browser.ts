import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { BackButton, observed } from './back-button.ts'

// A browser has no back button to listen to, only a history to go back in. While the button is observed, an
// entry of the app's own (the trap) sits on top of the page's: going back only leaves the trap, which is set
// again at once. Setting it drops the entries ahead, so the browser's forward never lands on it. Once nothing
// observes the button, the trap is removed, and the button goes back past the app, or is disabled when the app
// is the first page of the tab.
const trap = { backTrap: true }

const isTrap = (state: unknown) => typeof state === 'object' && state !== null && 'backTrap' in state

// Firefox's back button skips the entries the user never interacted with while they were the current one. The
// trap is set only once the user has interacted with the page's entry, or going back would skip it too and
// leave the app. These events come after the ones that mark the interaction.
const interactions = ['click', 'keyup'] as const

export const layer = Layer.effect(
  BackButton,
  Effect.gen(function*() {
    // Removing the trap goes back, which the browser does later: until then, the trap is still on top.
    let trapIs: 'Off' | 'On' | 'Removing' = 'Off'
    let hasInteracted = false
    let isObserved = false
    const removeTrap = () => {
      trapIs = 'Removing'
      window.history.back()
    }
    const setTrapIfObserved = () => {
      if (trapIs !== 'Off' || !isObserved || !hasInteracted) return
      window.history.pushState(trap, '')
      trapIs = 'On'
    }
    const { presses, press } = yield* observed(
      Effect.sync(() => {
        isObserved = true
        setTrapIfObserved()
      }),
      Effect.sync(() => {
        isObserved = false
        if (trapIs === 'On') removeTrap()
      }),
    )
    const onInteraction = () => {
      if (isTrap(window.history.state)) return
      hasInteracted = true
      setTrapIfObserved()
    }
    const onPopState = (event: PopStateEvent) => {
      // The browser's forward, onto a trap left by a reload.
      if (isTrap(event.state)) {
        trapIs = 'On'
        if (!isObserved) removeTrap()
        return
      }
      const wasPressed = trapIs === 'On'
      trapIs = 'Off'
      if (wasPressed && isObserved) {
        window.history.pushState(trap, '')
        trapIs = 'On'
        press()
      } else setTrapIfObserved()
    }
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        for (const type of interactions) window.addEventListener(type, onInteraction, true)
        window.addEventListener('popstate', onPopState)
        // A reload keeps the tab on the trap, over a page's entry the user may never have interacted with (one
        // left by an earlier version): a script can go back to it even when the back button would skip it.
        if (isTrap(window.history.state)) removeTrap()
      }),
      () =>
        Effect.sync(() => {
          for (const type of interactions) window.removeEventListener(type, onInteraction, true)
          window.removeEventListener('popstate', onPopState)
        }),
    )
    return { presses }
  }),
)
