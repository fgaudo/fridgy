# Design: the product added enters the fridge

Redesigned for React Native on 2026-10-30, in `src/app/children/add-products`. The web build's choreography (the
letters of the name gathering into a package, which flew on an arc) is gone: its measuring of the DOM has no
counterpart in a pure view. Read [`AGENTS.md`](../AGENTS.md), the `views` and `add-program` skills and the "Guide"
of `node_modules/@fgaudo/effect-tea/README.md` before changing it.

## Decisions

- **The platform interpolates; the state holds the phases.** The fridge is `Away`, `Open` while products are on
  their way into it, or `Closing` behind the last (`Fridge` in `program.ts`). Every motion of a phase is known when
  the phase starts, so each is a Reanimated layout animation, declared on the element, on the UI thread. Nothing of
  it (where a disc is, the door's angle) is in the state. Timers end the phases: `Arrived` per product, then
  `FridgeClosed`.
- **The fridge stays open while products keep coming.** A product added while the fridge is open joins those on
  their way, and the door closes only behind the last. One added while the fridge is closing opens it again. Each
  product goes by its number among those added this visit of the page (`Form.added`): two added within a second
  have the same creation date.
- **It starts when the write has completed**, not when the button is pressed: a failed write would otherwise have
  to undo it. Every successful add plays it, from either step's button. After either, the first step is shown,
  which draws the fridge.
- **The product is its disc.** What flies in, from the window's left edge, is the disc that leads its row in Home's
  list, without the ring (`docs/freshness.md`): the expiration day and month, or ∞, in the colors of the days left,
  by the same `Product.SOON_DAYS`. It shows what entered the fridge and how it will be listed, at one size whatever
  the name. A name flew first: a long one did not fit. The disc shrinks into the fridge's lower compartment, between
  its inside and its door. The inside is the lightest surface, under any disc.
- **It is the only acknowledgement on screen.** A screen reader hears the last product's name and expiration from
  a live region, drawn invisible in every state; the fridge is hidden from it.
- **Motion is Material's**: durations and curves from `src/styles.ts`, never a number of milliseconds in a view.

## The choreography

| Phase                                                   | Duration  | Starts at                          |
| ------------------------------------------------------- | --------- | ---------------------------------- |
| 1. The fridge appears: opacity 0 → 1, scale 0.9 → 1     | `medium2` | 0                                  |
| 2. The door opens, hinged on its right (`rotateY` 100°) | `short4`  | `medium2`                          |
| 3. The disc flies in from the left edge                 | `long2`   | `medium2`                          |
| 3. It shrinks to 0.2 and fades, into the compartment    | `short4`  | the last `short4` of its flight    |
| `Arrived`: the product is in                            |           | `medium2` + `long2` (800 ms)       |
| 4. The door closes behind the last                      | `short4`  | its arrival                        |
| 5. The fridge settles: a hop and a sway, from its base  | `medium1` | after the door                     |
| `FridgeClosed`: the fridge goes                         |           | `short4` + `medium1` after arrival |
| 6. The fridge fades away                                | `short4`  | on its removal                     |

A product added while the fridge is open flies at once (`IntoOpenFridge`), and arrives after `long2`. One added
while it closes opens the door again, at once, from closed: the door is drawn anew for each phase, so a closing cut
short jumps back to closed before it opens.

The flight decelerates (emphasized decelerate): the disc crosses most of the way at once, then eases to the
fridge, and shrinks as it reaches it (emphasized accelerate). The door and the settle take the standard curve, the
appearance the emphasized decelerate, the fading the standard accelerate.

Android's "Remove animations" makes every motion instant, as Reanimated does: the fridge appears open, stays for
the timers, closed for the last `short4` + `medium1`, and goes.

## Where things are, in the code

- **State and model** (`program.ts`): `Form.fridge` and `Form.added`; `admitted` takes a product into the fridge.
  The model shows the fridge on the first step (`Naming`, and `Adding` from it): not under the scanner, during a
  lookup or on the second step, where the timers end the phases unseen.
- **View** (`view.tsx`, `fridge`): centred in the first step's room, above the FAB, 96dp tall and smaller when the
  keyboard leaves less room. The fridge is keyed by its visit (the first product's number), so that one fading
  away and the next stand apart; its body by the phase, so that closing plays the settle; each disc by its
  product's number. A disc rests inside the compartment invisible, as its flight leaves it, until its arrival
  removes it. The model gives each product on its way its `Due`, by the clock's day: a product is made only once the
  clock has ticked.

## Verified, and not

Seen in the emulator (API 36, debug build, Vulkan) on 2026-10-30, frame by frame from a screen recording: one add
from the first step, three in a row, whose names, as they flew then, followed one another into the fridge while the
door stayed open, closing behind the last; and, as discs, one never expiring from the first step and one expiring
tomorrow from the second. Not seen yet: an add while the fridge closes (the door opening again), and "Remove
animations".
