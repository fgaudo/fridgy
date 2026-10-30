# Design: motion on React Native

Implemented on 2026-10-30, in `src/app/view.tsx` (the pages) and `src/app/children/home/view.tsx` (the menu), and
seen in the emulator the same day (see "Verified, and not"). Read [`AGENTS.md`](../AGENTS.md), the `views` skill
("Motion") and the "Guide" of `node_modules/@fgaudo/effect-tea/README.md` before changing it.

These are the motions of the web build that React Native draws again (`AGENTS.md`, "Known gaps"): how a page
enters and leaves, how Home's menu opens and closes, AddProducts' steps and scanner, the snackbars, and Home's rows
arriving and leaving. The other
motions are listed in "Later", each to be designed here, or in a doc of its own, before it is drawn.

## What the web build did

Its stylesheet and views, before commit `70461d9`, give the reference. Every transition was symmetric: what
enters decelerates, over Material's `medium-4`; what leaves accelerates, over `short-4`.

| What                            | Enters                                                  | Leaves                                        |
| ------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| AddProducts, EditProduct        | rises from the bottom edge (`translateY(100%)`)         | sinks back to the bottom edge                 |
| About                           | fades in and rises by 30px                              | fades out and sinks by 30px                   |
| Home, when a page opens over it | (it is already there)                                   | stays for `medium-4`, then fades in `short-1` |
| Home's menu                     | grows from the top right corner, from 80%, and fades in | shrinks to 80% and fades out                  |

AddProducts and EditProduct are Material's full-screen dialogs: a task opened over the page, closed with "×". About
is a page of its own, with a back arrow: Material's shared axis, on Y. Home is kept under the page that opens
until that page covers it, so the page never rises over nothing.

## Decisions

1. **The platform drives every one of them.** The start, the end and the duration are known when the movement
   starts, and nothing changes them on the way. This is the first case of "Who drives it" in the `views` skill. No
   state gains a phase. A page that the root stops drawing leaves. A menu that the model closes leaves.
2. **Reanimated's layout animations draw them.** An element takes its entering and exiting animations as props
   (`entering`, `exiting`), which a pure view can give. The exiting animation keeps a removed element on screen
   until it ends. That is the `remove` hook the web build relied on. React Native's own `Animated` holds its values
   in mutable objects, and `LayoutAnimation` is a global call. Neither fits a view that is a function of its model.
   Reanimated 4.7.1, with `react-native-worklets` 0.13.1, is the release whose peers include React Native 0.88
   (checked on npm on 2026-10-30). The release builds compile a native module. That needs the emulator pass of
   the `android-release` skill, on `minSdkVersion`'s image too.
3. **The root animates the pages; a page draws itself whole, as today.** The root wraps each page it draws in an
   `Animated.View` that fills the screen and carries the page's entering and exiting animations. Which page plays
   which motion is a matter of the stack: "page" is a role that the root's state keeps, so it is in the root. A
   page's view stays unaware of the motion. The wrapper is keyed by the page's name, as the `Fragment` is now.
4. **Pages over Home are drawn in a layer above Home's.** The root draws two layers that fill the screen, Home's
   under the others'. A leaving element keeps its place in the native tree, under the element drawn in its place,
   whatever its `zIndex`: drawn as siblings, About left under Home, and its exit was never seen. In its own layer, a
   page leaving to Home stays above it. The layers are `collapsable={false}`: Fabric drops a view that only lays
   out, and the pages were siblings again.
5. **Home's view animates its menu.** The menu is drawn in an `Animated.View`, with its scale's origin at its top
   right (`transformOrigin`). The scrim has no motion: it is invisible.
6. **Durations and curves are Material's tokens, in `src/styles.ts`.** A view names a token (`duration.medium4`,
   `easing.emphasizedDecelerate`), never a number of milliseconds. The tokens are the web build's (Material 3):

   | Token                  | Value                             |
   | ---------------------- | --------------------------------- |
   | `short1`               | 50 ms                             |
   | `short4`               | 200 ms                            |
   | `medium4`              | 400 ms                            |
   | `emphasizedDecelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
   | `emphasizedAccelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |

   The other tokens of Material's scale are added when a motion uses them.

## The choreographies

The durations and curves are those of the web build.

| What                     | Enters                                                                  | Leaves                                                      |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| AddProducts, EditProduct | from `translateY` the window's height, `medium4`, emphasized decelerate | to the window's height, `short4`, emphasized accelerate     |
| About                    | from opacity 0 and `translateY` 30dp, `medium4`, emphasized decelerate  | to opacity 0 and 30dp, `short4`, emphasized accelerate      |
| Home                     | no motion                                                               | opacity to 0 in `short1`, after a delay of `medium4`        |
| Home's menu              | from opacity 0 and scale 0.8, `medium4`, emphasized decelerate          | to opacity 0 and scale 0.8, `short4`, emphasized accelerate |

Every motion moves `transform` and `opacity` only, which Android composes without laying the page out again. The
dialogs are two worklets of the app, on `translateY`, by the window's height that Reanimated gives when the movement
starts. Reanimated's `SlideInDown` and `SlideOutDown` move the view in the layout instead (`originY`), and laid the
page out on every frame. About rises with `FadeInUp`, from the initial values it is given, and sinks with
`FadeOutDown`, by Reanimated's 25dp: a `Keyframe` would give 30dp, for a difference no one sees. `FadeOut` takes a
delay. The menu is a `Keyframe`, for the scale from 0.8.

Home enters with no motion: going back, it is drawn at once under the page that leaves over it. The page's own
leaving uncovers it.

## Reduced motion

Decided with the owner on 2026-10-30: **instant, as Android's own transitions are.** Android's "Remove animations"
sets the animator's duration scale to 0. Reanimated's `ReduceMotion.System`, its default, then skips to the end.
Nothing is in the model. The web build turned its motions into fades, as `prefers-reduced-motion` asked. Fades
here would need the setting as a source of the platform, observed by the root, and a tag in every model that
animates, for a look the platform already decides.

## AddProducts' steps and scanner, and the snackbars

Designed on 2026-10-30, after the pages and the menu, with the same decisions: the platform drives them, as
Reanimated's layout animations on `transform` and `opacity`, with Material's tokens, instant under "Remove
animations". Implemented in `src/app/children/add-products/view.tsx`, the snackbars also in
`src/app/children/edit-product/view.tsx` and Home's (`src/app/children/home/view.tsx`, drawn by `Products`).

### What the web build did

- **The steps.** The date step was drawn over the name step, which stayed under it. The date step came along
  Material's shared axis X: from opacity 0 and `translateX(2rem)`, over `medium-4`, emphasized decelerate; and back
  to them over `short-4`, emphasized accelerate. Going back, the date step left over the name step.
- **The scanner.** Material's full-screen dialog over the name step, rising from the bottom edge as the pages do,
  and sinking back. It rose opaque. Once in place (after `medium-4`), the surface's color left the camera's area
  over `short-4`, on the standard curve, to show the camera drawn behind the page.
- **The snackbars.** One rose by 0.5rem in fading in, over `short-3`, standard decelerate. One that came after
  another (`entrance: 'AfterAnother'` in the model) waited `short-2` for that one to leave. One left by sinking
  0.5rem in fading out, over `short-2`, standard accelerate.

### Decisions

1. **Each step and the scanner are a layer of AddProducts' frame**, in this order: the name step, the date step,
   the scanner, then the snackbar. Each is drawn in a `collapsable={false}` layer, as the root's pages are, so that
   what leaves stays above what is drawn under it: the date step and the scanner leave over the name step drawn
   again. A step is an `Animated.View` that fills its layer with the surface's color, keyed by the step
   (`naming`, `dating`, `scanner`). Its states keep the same key: `Naming`, `LookingUp` and an `Adding` from the
   name step are one name step, and do not play anything between them.
2. **The name step is held under what covers it, as Home is under a page.** The model has no state for "the name
   step under the date step". Drawing it there would need controls that take nothing, and a screen reader would
   read it. It leaves instead, holding still for `medium4` and then vanishing in `short1`, by when the date step
   or the scanner covers it. It enters with no motion: going back, it is drawn at once under what leaves.
3. **The scanner moves as the full-screen dialogs do.** Its two worklets are the pages' (`motion.fullScreenDialog`, now
   in `src/styles.ts`, a look of Material's that the root and AddProducts both draw). The camera's area holds a cover
   of the surface's color, over the camera and under the viewfinder's frame. It fades out on entering, after
   `medium4`, over `short4`, on the standard curve, and stays at opacity 0. It takes no touch.
4. **The snackbar's motion is Material's, in `src/styles.ts`** (`motion.snackbar`), the same for the three pages that draw
   one: an entering animation for each `entrance`, and one exiting. The snackbar stays keyed by what it tells, so
   the next one enters as the last one leaves.
5. **A snackbar's ghost keeps its place.** A leaving element keeps its last frame in its parent. Home's snackbar
   stood in a column that it sized, above the FAB: as it left, the column shrank and the ghost would have dropped
   onto the FAB. Home now draws it at the bottom of a layer that ends 16dp above the FAB, whose size never changes.
   AddProducts' and EditProduct's stand at an absolute place in their frame already.
6. **What a page draws is not played again by the page's own entrance or exit.** The root wraps each page in
   Reanimated's `LayoutAnimationConfig`, with `skipEntering` and `skipExiting`. By default, a removed subtree plays
   the exiting animations of the elements in it: Home's snackbar would fade out as Home is held under a dialog, and
   would rise again as Home comes back.

### The choreographies

| What                     | Enters                                                                 | Leaves                                                           |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The date step            | from opacity 0 and `translateX` 32dp, `medium4`, emphasized decelerate | to opacity 0 and 25dp, `short4`, emphasized accelerate           |
| The name step            | no motion                                                              | opacity to 0 in `short1`, after a delay of `medium4`             |
| The scanner              | as the dialogs                                                         | as the dialogs                                                   |
| The scanner's cover      | opacity from 1 to 0, after `medium4`, over `short4`, standard          | (leaves with the scanner)                                        |
| A snackbar               | from opacity 0 and `translateY` 8dp, `short3`, standard decelerate     | to opacity 0 and `translateY` 8dp, `short2`, standard accelerate |
| A snackbar after another | the same, after a delay of `short2`                                    | the same                                                         |

The date step enters with `FadeInRight`, from the initial values it is given, and leaves with `FadeOutRight`, by
Reanimated's 25dp, as About does. The snackbar leaves by a `Keyframe`, for its 8dp: `FadeOutDown`'s 25dp would be
three times what it rises. The cover is a `Keyframe` too, for its delay before it fades.

The new tokens, Material's:

| Token                | Value                        |
| -------------------- | ---------------------------- |
| `short2`             | 100 ms                       |
| `short3`             | 150 ms                       |
| `standard`           | `cubic-bezier(0.2, 0, 0, 1)` |
| `standardDecelerate` | `cubic-bezier(0, 0, 0, 1)`   |
| `standardAccelerate` | `cubic-bezier(0.3, 0, 1, 1)` |

## Home's rows

Designed on 2026-10-30, after the steps and the snackbars. Implemented in
`src/app/children/home/children/products/view.tsx`.

### What the web build did

- **A row arriving** opened its place as it faded in: its one grid track went from `0fr` to `1fr`, with its
  opacity from 0 to 1, over `medium-4`, emphasized decelerate. The rows under it moved down with the track.
- **A row leaving** closed its place as it faded out, over `short-4`, emphasized accelerate. The model keeps it
  where it was until then (`Leaving`, in Products' `presence`), and takes no tap on it.
- **The last row** did not close: the whole list faded out over the empty state, over `short-4`, emphasized
  accelerate. The empty state faded out the same way over the rows put back.

### Decisions

1. **The platform drives them, from the model's phase.** Products' state already keeps each row's presence and
   ends it with `RowsSettled`, after 500 ms. A row arriving is a new element, so it takes an entering animation. A
   row leaving stays the same element: it turns to a height of 0 and an opacity of 0, and a layout transition plays
   the change. A height to `auto` is not a value that React Native, nor Reanimated's CSS, can interpolate.
2. **Every row is clipped by its own frame.** The row's `Animated.View` has `overflow: hidden`, and its height is
   what Reanimated animates. The list item inside keeps its own height: the row's frame uncovers it from the top
   as it opens, and covers it back as it closes, as the grid track did.
3. **The rows that stay move by layout transitions.** A layout animation moves only its own view: the rows under
   one that opens are at their new place at once. Each row takes Reanimated's `LinearTransition`, so that it moves
   from where it was. Its duration and curve follow the row that changes: the model's `settling` says `Opening`
   while a row arrives, `Closing` while one leaves (the shorter motion wins when both happen), and `Still`
   otherwise, when no row has a layout transition. Reanimated publishes a changed `layout` prop before the commit
   that moves the views (`getSnapshotBeforeUpdate`), so the transition of a change is the one drawn with it.
4. **A row arriving opens its place even as Home enters.** Home is drawn anew when the page over it leaves, and the
   root skips the entering animations of what a page draws as it enters. A product added in AddProducts arrives
   while AddProducts sinks back. So the list is wrapped in its own `LayoutAnimationConfig`, which does not skip
   them: only a row the model says is arriving has an entering animation.
5. **The list and the empty state are layers.** The empty state is drawn in a layer at the top of the scroll's
   content, and the list in a layer above it, both `collapsable={false}`, as the root's pages are. The list leaving
   fades over the empty state. The empty state leaving fades under the rows put back, which cover it as they open.

### The choreographies

| What                      | Enters                                                        | Leaves                                                     |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| A row                     | from height 0 and opacity 0, `medium4`, emphasized decelerate | to height 0 and opacity 0, `short4`, emphasized accelerate |
| The rows under it         | move down, `medium4`, emphasized decelerate                   | move up, `short4`, emphasized accelerate                   |
| The list, the empty state | no motion                                                     | opacity to 0, `short4`, emphasized accelerate              |

A row leaving is a layout transition of its own, a worklet that also fades it. A row that came back while it left
opens again with the transition of the rows that stay, and is drawn opaque at once.

## Home's top app bar and its FAB

Designed on 2026-10-30, after the rows. Implemented in `src/app/children/home/view.tsx` and `program.ts`.

### What the web build did

- **The bar** was Material's medium top app bar, collapsing to the small one over the first stretch of the scroll.
  Its color and title slid up under the icons, the title shrinking from `headline-medium` to `title-large`, and its
  color darkened to `surface-container`. Scroll-driven animations played it, on the browser's compositor.
- **The snap.** A scroll that ended with the bar half collapsed scrolled on to the nearer shape. The program did
  it, with the commands `ExpandBar` and `CollapseBar` of the `Viewport` service.
- **The FAB** lost its label while the page scrolled (from `scroll` to `scrollend`), and got it back after.

### Decisions

1. **The headline is the top of the list, and the platform scrolls it.** The title is not morphed, which would
   lay it out again on every frame. It is drawn in the scroll's content, above the rows, in
   `headlineMediumEmphasized` with its subtitle. Android scrolls it out from under the bar's icons, on the UI
   thread. This is what Compose's medium bar does (`TwoRowsTopAppBar`): its lower row, with the large title, goes up
   and out. The bar above the list is the small one, 64dp: its icons, and its title.
2. **The fades follow the finger, and the program drives them.** The second case of "Who drives it": what they
   show depends on the scroll while it runs. The state holds how far the bar has collapsed (`collapse`, from 0 to
   1): how much of the headline is out of view. The headline fades out by half the collapse, quickly at first (standard decelerate). The list's edge cuts its top
   from the first pixel, and a fade over the whole collapse showed it cut and opaque (seen on the emulator). The
   fades also follow the scroll a frame or two late, since the program draws them: the quicker fade hides that too.
   The small title fades in
   late, and the bar's color early, by the curves of Compose's bar (`cubic-bezier(0.8, 0, 0.8, 0.15)` and
   `(0.4, 0, 1, 1)`). The collapse is held in twentieths. Each step draws Home again, so a whole collapse is at most
   twenty frames, and a scroll outside the headline draws none.
3. **The scroll reaches the program as About's does.** The view sends `Scrolled({ top })` on every scroll event.
   The state changes only when the collapse reaches another step. The headline's height is measured by its layout (`HeadlineLaidOut`), since it grows with the user's font size. Until
   it is measured, the bar is expanded and does not snap. The `Viewport` service goes: React Native's scroll is the
   view's, and no service observes it.
   The list's own height (`ListLaidOut`) and its content's (`ContentSized`) are measured too. Android moves the
   scroll with no scroll event in two cases. A list that gets shorter (products deleted) is pulled back within its
   end: the bar then collapses no further than the list can scroll. A new size of the screen or of the font (a new
   height of the list or the headline) put the list back at its top on the emulator, under a bar still collapsed: a
   headline row without its title, and the small title above it. The scroll is not known after that, so the program
   makes it known. Under a collapsed bar, such a change gives the list a new `key`: React draws it anew at its top,
   and the bar expands. An expanded bar needs nothing.
   Home itself is drawn anew when a page over it leaves, and its list started at its top under a bar still
   collapsed (seen on a phone). So `ScrollEnded` carries where the list rests (`rest`), and the list is drawn from
   there (`contentOffset`). Android scrolls to `contentOffset` whenever it changes, and it changes only to where the
   list already rests.
4. **Android snaps.** The list snaps to `[0, height of the headline]` (`snapToOffsets`, with `snapToEnd` off), so
   that a scroll never ends with the headline cut, nor the fades halfway. No command scrolls. The price: a fling released before the
   headline is gone stops where the headline is gone, as React Native's snap clamps it there (`flingAndSnap`).
   A second fling scrolls on. A short list that cannot scroll as far as the headline rests where it ends.
5. **The color is a layer's opacity.** `PlatformColor` is not a value that can be mixed, so a layer of
   `surfaceContainer` lies under the content of both rows, the small bar and the headline, which are one surface.
   Its opacity follows the collapse, as the web build's `bar-scrolled` did.
6. **The selection's bar has the same shape.** Its title, "2 selected", is the headline in the list, and the small
   title once the headline is gone. The headline and the bar take the selection's `secondaryContainer`, at rest and
   scrolled.
7. **The FAB loses its label from the drag to the end of the momentum.** `onScrollBeginDrag` sends
   `ScrollStarted`, and `onMomentumScrollEnd`, which Android sends after every touch, even without a fling,
   `ScrollEnded`. The label fades. The FAB's width follows by a layout transition, which moves only the FAB.
8. **One headline for a screen reader.** The headline in the list is the header. The small title repeats it, and is
   hidden from accessibility.

### The choreographies

The headline, the small title and the color follow the scroll (decision 2), and have no duration.

| What            | Enters                                                        | Leaves                                      |
| --------------- | ------------------------------------------------------------- | ------------------------------------------- |
| The FAB's label | opacity from 0, `short4`, standard decelerate, after `short2` | opacity to 0, `short2`, standard accelerate |
| The FAB's width | grows, `medium4`, emphasized decelerate                       | shrinks, `short4`, emphasized accelerate    |

## Verified, and not

Seen on 2026-10-30, on the emulator's API 37 image, in builds that slowed the motion (About's to 3 s, then every
token ×10), and at the real speed:

- **A leaving page is inert (verified).** The web build set `pointerEvents: 'none'` on what left. A removed element
  cannot take new props, and needs none. A tap on About's back arrow while About sank over Home sent nothing. A tap
  on the place of Home's row, under the leaving About, did not open the row either. The program does not rely on
  it: a tap that did arrive would reach an About no longer in the stack, and be rejected.
- **About enters over Home, held under it (verified).** Home stays under About as it rises, with its menu, which
  Home's own leaving keeps as it was. Home's layer is under About's, and About's exit plays over the Home drawn
  again (decision 4).
- **The dialogs and the menu (verified).** AddProducts and EditProduct rise over Home and sink back over it. Their
  surface is Home's, as in the web build: no edge is seen, only the content moving. The menu grows from its top
  right corner and shrinks back into it.
- **An interrupted movement (verified).** EditProduct, closed with Android's back button while it rose, sank from
  where it was, without jumping to the top first.
- **The frames (measured).** `adb shell dumpsys gfxinfo`, over three openings and closings of each. With the
  image's OpenGL renderer, which the emulator translates for the host's GPU, nothing keeps 60 fps: Android's
  Settings, flung, has a median frame of 18 ms, 12 ms of it on the GPU, and a native scroll of About the same. The
  motions stayed at that floor (90th percentile: About 26 ms, the menu 36 ms, the dialogs 25 ms). With
  `SlideInDown`, the dialogs' 90th percentile was 65 ms. On Vulkan (`debug.hwui.renderer` set to `skiavk`, as the
  `android-release` skill says), the GPU takes 1 ms: About scrolls at a median of 8 ms (90th percentile 10 ms), and
  AddProducts opens and closes at 6 ms (90th percentile 14 ms), under a 60 Hz frame. How smooth they are on a
  phone is not measured.
- **The tests (verified).** `bun test` cannot load Reanimated. The preload (`libs/testing/preload.test_support.ts`)
  replaces it, as it replaces React Native: `Animated.View` becomes its name, and the builders become values that
  the tests ignore.
- **The bundle (verified).** Worklets' plugin (`react-native-worklets/plugin`) is the last in `babel.config.cjs`.
  `bun run bundle` and `hermesc` compile it.

Seen on 2026-10-30, on the same image and on Vulkan, for AddProducts' steps and scanner and the snackbars (in a
build with every token ×10, then at the real speed):

- **The steps (verified).** The date step comes from the right in fading in, over the name step, which holds still
  under it and is gone once it is covered. Going back, the date step leaves to the right over the name step drawn
  again.
- **The scanner (verified).** It rises opaque over the name step, the viewfinder's frame already drawn. The cover
  holds the surface's color until the scanner is in place, then fades to the camera (the emulator's webcam). It
  sinks back over the name step drawn again, with the camera still in it.
- **Home's snackbar (verified).** "Product deleted" rises 16dp above the FAB, and the FAB does not move. Undone, it
  sinks where it stood, and a second tap on "Undo" while it left sent nothing. A second deletion's snackbar waits
  for the first to leave, then rises in its place.
- **"Remove animations" (verified).** With Android's three scales at 0, the scanner was in place, its cover gone,
  a quarter of a second after the tap.
- **The frames (measured).** `dumpsys gfxinfo`, three times each, at the real speed. The steps, forth and back: a
  median of 8 ms, 5 frames out of 132 over 16 ms, none over 24 ms. The scanner's closing: under 40 ms, most frames
  under 12 ms. Its opening: most frames under 12 ms, and one to three of 100 to 400 ms as the camera starts
  (`AGENTS.md`, "Known gaps"). Home's deletions and undos, with their snackbars: a median of 8 ms, none over 29 ms,
  with the list's rows changing too.

Seen on 2026-10-30, on the same image and on Vulkan, for Home's rows (in a build with every token and the settling
timer ×10, then at the real speed):

- **A row leaving (verified).** Deleted in the middle of the list, it fades and its frame covers it from the
  bottom, while the row under it rises in step. Two rows apart close their places at once.
- **A row arriving (verified).** Put back by "Undo", it opens its place at the end of the list as it fades in, and
  ends at its full height and opacity.
- **The last rows (verified).** Deleting every row fades the whole list over the empty state. "Undo" brings the
  rows back opening, over the empty state that fades out under them. The rows' surface hides the part of the disc
  they cover, for the 200 ms of the fade.
- **The frames (measured).** Three deletions and undos, at the real speed: a median of 7 ms, the 90th percentile
  15 ms, 9 frames out of 138 over 16 ms.

Seen on 2026-10-30, on the same image, for Home's top app bar and FAB (a debug build, on the reference screen at a
font scale of 1.3, with seven, then twelve products, at the real speed):

- **The two shapes (verified).** At rest, the headline "Fridgy" and "7 items" lie under the small bar's icon, on
  the surface. Scrolled past it, the small bar holds "Fridgy" and "7 items" on `surfaceContainer`. A fling back to
  the top expands it again. The selection's bar takes both shapes, in `secondaryContainer`.
- **The fades (verified).** Halfway through a drag, the headline is half faded as it rises, the small title only
  begins to show, and both rows have begun to darken, as one surface.
- **The snap (verified).** Released halfway with no speed, the list went back to its top. Drags of 30dp and 60dp
  from the top, released with some speed, ended with the headline just out of view.
- **A fling from the top (verified).** On twelve products, it stopped with the headline just out of view, as
  decision 4 says.
- **A new screen and font (verified).** Collapsed on the reference screen at 1.3, then back to the emulator's own
  screen at 1.0: the list was drawn anew at its top, the bar expanded with one title, and the list scrolled and
  collapsed the bar again.
- **The FAB (verified).** During a drag it is the icon alone, and it has its label back once the scroll ends.

Not yet seen:

- **The frames of the bar and the FAB**, and how the FAB's width moves at the real speed.

- **A row arriving as Home enters.** A product added in AddProducts should open its place as AddProducts sinks
  (decision 4 of "Home's rows"); the frames were not caught.
- **AddProducts' and EditProduct's snackbars.** They tell of failures that the emulator does not give (a write
  that fails, a setting not kept). They are drawn as Home's is, at a place of their frame that does not move.
- **A snackbar under a page that opens or leaves.** `LayoutAnimationConfig` keeps it still (decision 6 of the
  second design); no frame was caught with a snackbar standing as a page opened.

- **The feel at the real speed.** Each motion was seen in frames of the slowed builds. At 400 ms and 200 ms the
  screenshots catch only the end: whether they feel right is the owner's to judge, on the emulator or a phone.
- **"Remove animations"**, which should make every motion instant.
- **Two pages stacked in one frame.** The "Known gaps" item (EditProduct and AddProducts pushed together) gives
  two pages in the upper layer. The motion does not make it worse, but it shows it.
- **The release on `minSdkVersion`'s image.** Reanimated is a native module: the `android-release` skill asks for
  the pass on API 29 too.

## Later

Each of these is designed before it is drawn:

- the product entering the fridge (`docs/product-flight.md`);
- Android's predictive back, which the web build never had.

## What to check in the emulator

On the reference screens of the `android-release` skill, in both themes: each page entering and leaving, by its
button and by Android's back button, at normal speed and in a build that slows the motion (a page's taps are then
easy to try while it leaves). Home under a page as it rises, and never a frame of the surface alone. The menu,
opened and closed by a tap on its item and on the scrim. Then with "Remove animations" on: every motion
instant.
