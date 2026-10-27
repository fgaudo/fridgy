# Design: the product added flies into a fridge

Status: designed on 2026-10-27, not implemented. This document is the brief for whoever implements it, person or
agent: read [`AGENTS.md`](../AGENTS.md), the `views` and `add-program` skills and the "Guide" of
`node_modules/@fgaudo/effect-tea/README.md` first; their rules apply to every part of this change and are not
repeated here. Where the implementation departs from this design, and why, goes in an "As implemented" section
at the end.

Decisions already taken by the owner:

- **No position, no tick, no new state.** The flight is drawing: the state holds only that a product is being
  acknowledged, as it already does (`maybeAcknowledging` in `src/app/children/add-products/program.ts`), and the
  browser interpolates. Nothing of the choreography (where the product is, whether the fridge has bounced) is
  ever in the state or in the model. The rule that decides this, here and for anything heavier, is "Motion" in
  the `views` skill: the destination is known at the start, so the browser interpolates; a tick per frame would
  cost a model, a view and a patch per frame, for a motion that CSS runs off the main thread.
- **The flight starts when the write has completed, not when the button is pressed.** A failed write would
  otherwise have to fly back. The write is mostly quicker than a frame, so nothing perceptible is lost.
- **Every successful add flies**: from the first step's button, from the second step's, and from the snackbar's
  "Add again". Today only the first step's own button acknowledges its product; this change widens that concern
  to every add, while the button's indicator stays the first step's button's.
- **Motion is Material's**: easing curves and durations from `src/styles.css`, never a number of milliseconds in
  a view. A choreography of several movements in sequence (the flight, then the fridge's bump) is written as
  CSS `@keyframes` with `animation-delay`; a single change of state keeps using transitions with snabbdom's
  `delayed` and `remove`, as the rest of the app does.

## Goal and scope

Once a product has been added, a small generic product leaves the control that added it and lands inside a
stylized fridge drawn at the top of the page, which bounces as it arrives. The page otherwise behaves as it does
now: the first step's button keeps its indicator for a moment, the snackbar comes with its action.

In scope: the fridge, the flying product and its arc, the fridge's bump, the widening of the acknowledgement to
every add, the measuring hook, the reduced-motion fallback, the tests, the docs and the `views` skill. Out of
scope, for a later change (see "Later"): a door that opens and closes, a count of the products added this
visit, a sound.

## The state and the model

### What changes in `program.ts`

The state already has the phase: `Completed` with `succeeded: true` sets `maybeAcknowledging` to the product's
`creationDate`, the subscription keyed `['acknowledging', at]` runs `acknowledgingTimer` while the page is on
top, `AddedShown({ at })` ends it, and a later add replaces it, restarting the timer anew. Three things change:

1. **The phase records who added.** `maybeAcknowledging` becomes `Opt.Option<Acknowledging>` with

   ```ts
   /** The product added a moment ago, until a timer says its arrival has been shown, and what added it. */
   export type Acknowledging = Readonly<
     { at: DateTime.Utc; by: 'NameButton' | 'DateButton' | 'Snackbar' }
   >
   ```

   `by` is a fact of the add, not a choice of the view: the view needs it to know where the product leaves from
   and which button holds its indicator. `Completed` sets it on every success: `by` is `'Snackbar'` when
   `state.from === 'Snackbar'`, else `'NameButton'` or `'DateButton'` after `state.step._tag`. The subscription's
   key stays `['acknowledging', at]`, and `AddedShown` still matches by `at` alone: a timer of a replaced
   acknowledgement may still end, and ends only its own.
2. **The duration is the choreography's.** `ACKNOWLEDGING_DURATION` becomes the flight plus the bump (see
   "Timing"), with its comment saying that the view's keyframes must fit in it: the element is removed when
   the phase ends, wherever its animation is.
3. **The header comment** of `program.ts` ("A step's button shows its indicator only while it is the one
   adding…") says that every add is acknowledged by the product's flight, and the first step's button by its
   indicator too.

### What the model shows

- `Naming`, `Dating` and `Adding` get `maybeEntering: Opt.Option<Entering>`, with

  ```ts
  /** The product entering the fridge, by when it was created, and the control it leaves from. */
  export type Entering = Readonly<
    { at: DateTime.Utc; from: 'NameField' | 'DateField' | 'Snackbar' }
  >
  ```

  made from `form.maybeAcknowledging` (`NameButton` leaves from the name field, `DateButton` from the date field).
  `Adding` shows it so that a second tap during the flight does not cut it: the flight of the previous product
  goes on while the next is written, and the next `Completed` replaces it. `LookingUp` and `Scanning` do not show
  it: the scanner rises over the step, and the product in flight goes with the frame; the phase still ends by its
  timer, unseen, as a hidden page's would.
- `Naming.acknowledging` stays `'Added' | 'Nothing'`, now `'Added'` exactly when `maybeAcknowledging` is some
  and `by === 'NameButton'`: the indicator remains the first step's button's, as the skill's rule says ("an
  element that enters because something changed gets its entrance from the model").

### Tests (`program.test.ts`, `program.test_arbitrary.ts`)

- The arbitrary of the form produces `Acknowledging` values; a `by` arbitrary over the three adders.
- "the first step's button acknowledges the product it added exactly while its timer runs" becomes two
  properties: the button's indicator (`'Added'` iff some and `by === 'NameButton'`) and the model's
  `maybeEntering` (some iff `maybeAcknowledging` is some, with `at` and `from` mapped as above, on `Naming`,
  `Dating` and `Adding`; none on `LookingUp` and `Scanning`).
- "success after a step's product starts the next one at the name…" asserts `maybeAcknowledging` set for any
  step, `by` after the step; "success after the snackbar keeps the step as it is…" asserts it set with
  `by: 'Snackbar'`. Both names and the `describe`'s comment say that every add is acknowledged.
- "AddedShown ends the acknowledgement of the product it names…" and the subscriptions test are unchanged in
  meaning: check that their names still say what they assert.
- `dispatchViolations` and `messagesSentBy` need nothing: the flight sends no message.

## The view

### Where things are drawn

- **The fridge** is drawn once, by the page's root (`view` in `view.tsx`), in a layer over both steps
  (`fixed`, above the steps' `z`, `pointer-events-none`), at the trailing end of the app bar, under the safe
  area (`pt-sait`, `pr-sair`): a 40dp stylized fridge as an inline `<svg>` with its own `viewBox`, a body in
  `fill-primary-container` with a `stroke-primary` outline, a line for the door and a short handle in
  `fill-primary`, built like the freshness ring in `home/children/products/view.tsx`. It carries
  `data-fridge`, so that the measuring hook finds it. Both steps' app bars leave that room: their titles are
  short enough today; check the widest ("Set expiration") at the narrowest supported width.
- **The product** is a `material-symbols-rounded` span (`package_2`, which the `material-symbols` package the
  app imports whole has) in `text-primary`, 24dp, drawn in the same layer, `fixed`,
  only while `maybeEntering` is some, keyed by `entering.at` (`key={`entering-${DateTime.toEpochMillis(at)}`}`)
  so that the next product's flight is a new element and the previous one is dropped where it is.
- **The start points** are marked where they are drawn: the name field's trailing slot (the 48dp square where
  its icon button goes) with `data-flies-from='NameField'`, the date field's with `data-flies-from='DateField'`,
  the snackbar's `room` with `data-flies-from='Snackbar'`. The room, not the snackbar: the snackbar that was
  tapped is keyed by the previous product and may be leaving, replaced by the next one, while the room is
  always there. Each step draws a room of its own, the date step's over the name step's: the hook takes the
  last match in document order, which is the step on top.

### The arc, in CSS

The flying product is two nested elements, so that two one-dimensional animations make a curve with no
calculation: the outer one moves in X, the inner one in Y and then shrinks and fades.

```css
/* The flight of a product added into the fridge: X and Y animated apart make an arc (see docs/product-flight.md). */
@keyframes flight-x {
  to {
    transform: translateX(var(--flight-dx));
  }
}
@keyframes flight-y {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  80% {
    transform: translateY(var(--flight-dy)) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(var(--flight-dy)) scale(0.4);
    opacity: 0;
  }
}
@keyframes fridge-bump {
  0%, 100% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.12);
  }
}
```

- The outer element: `animation: flight-x var(--transition-duration-long-2) var(--ease-standard) forwards`.
- The inner element: `animation: flight-y var(--transition-duration-long-2) var(--ease-emphasized-decelerate)
  forwards`. Y reaches the fridge's height early, while X is still on its way: the product rises, then levels
  into the door, and shrinks into it in the last fifth.
- The fridge's `<svg>` wraps an inner `<g>` keyed by `entering.at`, drawn only while `maybeEntering` is some,
  with `animation: fridge-bump var(--transition-duration-short-4) var(--ease-standard)` and
  `animation-delay: var(--transition-duration-long-2)`: the bump plays once the product has arrived. The fridge
  itself keeps its key, so that it is not redrawn.
- `prefers-reduced-motion: reduce`: the product fades out in place (`flight-x` and `flight-y` replaced by an
  opacity-only keyframe over `short-4`) and the fridge does not bump.
- Durations and curves come from `src/styles.css`'s tokens, as every motion in the app: the keyframes are new
  there, next to the utilities, in a comment-headed block of their own, never in a `.tsx`.

### Timing

| What                     | Token                           | Value  |
| ------------------------ | ------------------------------- | ------ |
| flight                   | `--transition-duration-long-2`  | 500 ms |
| bump, after the flight   | `--transition-duration-short-4` | 200 ms |
| `ACKNOWLEDGING_DURATION` | `Duration.millis(700)`          | 700 ms |

The phase ends when the bump ends: the elements are removed when the model drops `maybeEntering`, and nothing
visible is cut. The first step's button holds its indicator for the same 700 ms; if that reads as too long, the
indicator's own `remove` transition can be preceded by a `@keyframes` fade starting at `medium-2`, in the view,
with no change to the state: the phase is one, the drawings are two.

### Measuring: the FLIP hook

The start and the fridge are in the layout, at heights that vary (the supporting text, the date step, the
keyboard), so the view measures them once, when the flying element enters the document, as `focusOnInsert`
does for the focus. A hook in `src/libs/tea-snabbdom/tea-snabbdom.ts`, generic, knowing nothing of fridges:

```ts
/**
 * Places an element where `from` is and gives it the way to `to`, as `--flight-dx` and `--flight-dy`, once it is
 * in the document: the keyframes then move it there. Measured once, on insertion: a measure on every frame
 * would fight the animation.
 */
export const flyFromTo = (from: string, to: string): NonNullable<Hooks['insert']> => (vnode) => { … }
```

It takes two selectors (`[data-flies-from="NameField"]`, `[data-fridge]`), reads both `getBoundingClientRect`,
sets the element's `left` and `top` to the start's centre (minus half its own size) and the two custom
properties to the difference of the centres. The elements are read inside the page's root (`vnode.elm.closest`
of the page's `key`, or `document` when the page is the only one with such markers): the date step draws over
the name step, so the selector must find the field of the step that added, which `from` names. Reading the DOM
is drawing, as the skill allows for a hook; the program never learns the numbers.

If the start's marker is not in the document (it should always be: the three markers are drawn in every
state that shows `maybeEntering`), the hook falls back to the fridge's own position and the product only fades
in there: no defect, a view never crashes the run for a missing element.

### What stays as it is

- The snackbar, its entrance after another, the step kept or restarted, the focus of the field drawn anew.
- The page's own transitions (`key='AddProducts'`, `delayed`/`remove`): the layer is inside the page, and goes
  with it.
- A second add during the flight: the key changes, snabbdom drops the old element (no `remove` style: it is
  invisible by then, or close to) and inserts the new one; the state restarts the timer, as now.
- Leaving the page mid-flight: the page leaves with the layer. The timer, which runs only while the page is on
  top, ends the phase on the next visit, unseen.

## The docs and the skill

- `views` skill: add that a choreography of movements in sequence is written as `@keyframes` in `src/styles.css`
  with `animation-delay`, keyed elements playing them on insertion, and that geometry the layout does not fix is
  measured once in an `insert` hook (`flyFromTo`), never on every frame and never by the program; and that
  `prefers-reduced-motion` reduces a flight to a fade.
- `src/README.md`: nothing, unless the line on `tea-snabbdom` ("handlers, renderer, test support") comes to
  list its hooks.
- This document: "As implemented" at the end, with the departures and their reasons.

## Order of work

1. `program.ts`: `Acknowledging` with `by`, `Completed` setting it on every success, `Entering` in the model,
   the duration, the comments. `program.test_arbitrary.ts` and `program.test.ts` as above; `bun test` green.
2. `styles.css`: the three keyframes and the reduced-motion block.
3. `tea-snabbdom.ts`: `flyFromTo`, with a test of what it does to the element's style on a fake DOM if the
   library's tests have one, else none: it is a hook, checked in the browser.
4. `view.tsx`: the fridge and the layer in the root, the markers on the fields and the rooms, the flying product.
   Check with `bun run watch` in the browser (the development server swaps the view in place): an add from
   each step, a repeat from the snackbar, two adds in a row, reduced motion on, dark theme, the narrowest width.
5. The skill and this document.

Typecheck, Biome and oxlint clean at every step; `bunx dprint fmt` on the files touched only.

## Later

- The fridge's door opens as the product approaches and closes behind it: a `<g>` of the door keyed by
  `entering.at` with a `rotateY` keyframe in perspective, in the same choreography; no state.
- A count of the products added this visit, on the fridge: a number the state would have to keep
  (`addedThisVisit`), shown by the model; a change of the state, small, decided apart.
- Android: the WebView runs keyframes and `prefers-reduced-motion` from the system's "Remove animations"
  setting; check both in the emulator, with the dark theme (see "Known gaps" in `AGENTS.md`).
