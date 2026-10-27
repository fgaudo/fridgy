# Design: the product added enters the fridge

Status: implemented on 2026-10-27, in rounds: first a product flying into a fridge in the app bar, which
bounced; then, at the owner's request, the fridge moved to the middle of the first step's empty space and the
choreography below, the fridge drawn only while a product enters it; then, the choreography saying what was
added, the snackbar removed with its "Add again", a live region telling a screen reader instead. Not yet seen
on Android (see "Verified, and not"). Read [`AGENTS.md`](../AGENTS.md), the `views` and `add-program` skills
and the "Guide" of `node_modules/@fgaudo/effect-tea/README.md` before changing it.

## Decisions

- **No position, no tick, no new state.** The choreography is drawing: the state holds only that a product is
  being acknowledged (`maybeAcknowledging` in `src/app/children/add-products/program.ts`), and the browser
  interpolates. Nothing of it (where a letter is, whether the door is open) is ever in the state or in the model.
  The rule is "Motion" in the `views` skill: every destination is known at the start, so the browser
  interpolates; a tick per frame would cost a model, a view and a patch per frame, for a motion that CSS runs off
  the main thread.
- **It starts when the write has completed, not when the button is pressed.** A failed write would otherwise have
  to undo it. The write is mostly quicker than a frame, so nothing perceptible is lost.
- **Every successful add plays it**, from either step's button.
- **It is the only acknowledgement on screen.** The snackbar that said what was added, with an action adding it
  again, is gone: the owner judged that the fields and the choreography say what was added. A second package is
  one tap from the first step, whose name stays; one with an expiration date has its digits typed again. A
  screen reader hears the product's name and expiration from a polite live region, for which the choreography is
  decoration (`aria-hidden`).
- **Motion is Material's**: easing curves and durations from `src/styles.css`'s tokens, never a number of
  milliseconds in a view.

## The choreography

| Phase                                                   | Duration            | Starts at |
| ------------------------------------------------------- | ------------------- | --------- |
| 1. The letters of the name gather into a package        | `medium-2` (300 ms) | 0         |
| 1. The fridge appears                                   | `medium-2` (300 ms) | 0         |
| 2. The fridge's door opens                              | `short-4` (200 ms)  | 300 ms    |
| 2. The package flies into the fridge                    | `long-2` (500 ms)   | 300 ms    |
| 3. The package is inside; the door closes over it       | `short-4` (200 ms)  | 800 ms    |
| 4. The fridge settles: a hop and a sway, from its base  | `medium-1` (250 ms) | 1000 ms   |
| `ACKNOWLEDGING_DURATION`, when every element is removed | the sum             | 1250 ms   |
| 5. The fridge fades away, on its removal                | `short-4` (200 ms)  | 1250 ms   |

1. **Letters.** The view lays a copy of the product's name over where it is written: the name field after the first
   step's button, the second step's heading after its button (the date field holds only digits). Each piece is a
   `<span>`, in the source's font, on its first line (pieces past its width are hidden). Each moves to the centre
   of the visible pieces, shrinking and fading, the first starting first and the last `short-2` later; the package
   grows from that centre meanwhile. The name stays in its field for the next product: the field, drawn anew after
   any add, hides its text while the letters gather, over it or over the second step leaving above it, and fades it
   back in (`name-return`); the letters take the surface's text color, not the field's. Pieces are letters
   (grapheme clusters), or words and the spaces between them in a script whose letters join (Arabic and its family,
   Brahmic scripts), where a letter drawn alone would not be the letter shown: `piecesOf` in
   `src/libs/strings/pieces.ts`.
2. **Flight.** The package flies on an arc that two elements make: the outer one moves in X with the standard
   curve, the inner one in Y with the emphasized decelerate curve. The door of the fridge's lower compartment, an
   HTML element hinged on its right, turns out of the fridge (`rotateY`, in its compartment's `perspective-near`)
   as the flight starts. The fridge is HTML, not SVG: CSS transforms on SVG elements are flat, and the door needs a
   perspective.
3. **Inside.** The package flying is drawn over both steps, so the door could not close over it: at its arrival
   it vanishes and a copy drawn inside the fridge, between the inside and the door, appears in its place; the
   door then closes over the copy.
4. **Settle.** The fridge hops and sways once from its base.
5. **Away.** The fridge is there only while a product enters it, as the owner asked once it had been drawn always:
   it appears with the letters (fading in, from 90% of its size) and fades away when the phase ends, with
   snabbdom's `remove` style. Its keyframes do not fill forwards, so that they do not override that transition. A
   product added while the fridge is still there brings a fridge of its own, which appears over the one fading.

The first step's button keeps its indicator for the whole phase, as the state says, and the keyframes cut it
short: the indicator fades out and the label back in at the end of phase 1 (`indicator-leave`, `label-return`).

With `prefers-reduced-motion: reduce`, the letters fade where they are, the package fades in where they were and
fades out at the arrival, and the door stays closed: the fridge only fades in and out.

## Where things are, in the code

- **State and model** (`program.ts`): `Acknowledging` is `{ product, by }`, `by` the button that added the
  product, set by every successful `Completed`; `AddedShown({ at })` ends only the one whose product was created
  at `at`. The model shows `Entering` (`{ product, from }`, `from` being where the name is written: `NameField`,
  `DateHeading`) on `Naming`, `Dating` and `Adding`, so that a second tap does not cut the choreography; not
  under the scanner nor during a lookup, where the phase ends by its timer, unseen. `Naming.acknowledging` is `'Added'`
  only for the first step's button.
- **Keyframes and utilities** (`src/styles.css`, the block after the icon utilities): the four phases' durations
  are named on `:root` (`--choreography-*`), and every delay is a sum of them. Two animations of one property
  on one element are written in one utility, the later overriding from its delay on.
- **Measuring** (`gatherAndFly` in `src/libs/tea-snabbdom/tea-snabbdom.ts`), once, when the product enters the
  document: the source's text box (inside its border and padding; an input's line centred, another element's
  first line), the font it copies to the letters, each letter's way to their centre, the package's
  place there and its way to the fridge's inside. It searches the whole document and takes the last match of
  each selector, the one drawn on top; it measures its own place first, as its containing block (the page's
  root) is transformed. Without the source, the package starts in the fridge, with no letters; without the
  fridge, nothing is shown.
- **View** (`view.tsx`): the fridge is drawn by the first step, while a product enters, in its room, centred
  above the FAB (`bottom-16`), 96dp tall and smaller when the keyboard leaves less room (`max-h-full`); keyed by
  the product entering, so that the next one plays it all anew, in
  one cell of a grid, so that a fridge leaving and the next one stand in the same place. The letters
  and the package are drawn by the page's root, in a layer between the steps and the scanner, which rises over
  them. The sources carry `data-flies-from`, the fridge's inside `data-fridge`. The live region is drawn by the
  page's root in every state, empty while nothing enters: a region is announced when its text changes.

## Known limits

- **One line.** A heading on two lines gives its letters of the first line only, and a long name only those that
  fit the field; a name scrolled in its input is laid as if it were not.

## Verified, and not

Seen in a browser on 2026-10-28 by freezing copies of the animated elements at chosen moments, at 375×812 and
320×568, light and dark, and with the stylesheet's reduced-motion rules applied by hand (the pane cannot emulate
the setting): an add from each step, two adds in a row, names in Latin, Arabic (by word, right to left) and
Devanagari (by word) laid exactly over the field's text, a long name whose letters past the field's width are
hidden, and the announcement ("Yogurt greco added. Expires 12 Dec 2027"). The check found and fixed: the letters
invisible, as they copied the color of the field fading its text in; the field showing the name again under the
heading's letters after an add from the second step; the handles drawn in `primary` on `primary-container`,
faint in the dark theme, now `on-primary-container`. A write in the browser took up to two seconds, so a second
add landing while the first is still entering was not seen. Not seen on Android: the WebView follows "Remove
animations" with `prefers-reduced-motion`; check it in the emulator (see "Known gaps" in `AGENTS.md`).
`gatherAndFly` has no test: `tea-snabbdom` has no fake DOM.

## Later

- A count of the products added this visit, on the fridge: a number the state would have to keep
  (`addedThisVisit`), shown by the model; a change of the state, small, decided apart.
