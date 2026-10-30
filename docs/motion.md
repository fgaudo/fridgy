# Design: motion on React Native, the pages and the menu

Implemented on 2026-10-30, in `src/app/view.tsx` (the pages) and `src/app/children/home/view.tsx` (the menu), and
seen in the emulator the same day (see "Verified, and not"). Read [`AGENTS.md`](../AGENTS.md), the `views` skill
("Motion") and the "Guide" of `node_modules/@fgaudo/effect-tea/README.md` before changing it.

This is the first of the motions the web build had that React Native draws again (`AGENTS.md`, "Known gaps"). It
covers how a page enters and leaves, and how Home's menu opens and closes. The other motions are listed in "Later",
each to be designed here, or in a doc of its own, before it is drawn.

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

Reanimated has builders for the first three. `SlideInDown` and `SlideOutDown` move by the window's height, which
they read when the movement starts. About rises with `FadeInUp`, from the initial values it is given, and sinks with
`FadeOutDown`, by Reanimated's 25dp: a `Keyframe` would give 30dp, for a difference no one sees. `FadeOut` takes a
delay. The menu needs a `Keyframe`, for the scale from 0.8. None of these needs a worklet written in the app.

Home enters with no motion: going back, it is drawn at once under the page that leaves over it. The page's own
leaving uncovers it.

## Reduced motion

Decided with the owner on 2026-10-30: **instant, as Android's own transitions are.** Android's "Remove animations"
sets the animator's duration scale to 0. Reanimated's `ReduceMotion.System`, its default, then skips to the end.
Nothing is in the model. The web build turned its motions into fades, as `prefers-reduced-motion` asked. Fades
here would need the setting as a source of the platform, observed by the root, and a tag in every model that
animates, for a look the platform already decides.

## Verified, and not

Seen on 2026-10-30, on the emulator's API 37 image, in builds that slowed the motion (About's to 3 s, then every
token ×10), and at the real speed:

- **A leaving page is inert (verified).** The web build set `pointerEvents: 'none'` on what left. A removed element
  cannot take new props, and needs none. A tap on About's back arrow while About sank over Home sent nothing: a
  second `leave` would have been a defect (`leave` in `src/app/program.ts`), and the app went on. A tap on the
  place of Home's row, under the leaving About, did not open the row either.
- **About enters over Home, held under it (verified).** Home stays under About as it rises, with its menu, which
  Home's own leaving keeps as it was. Home's layer is under About's, and About's exit plays over the Home drawn
  again (decision 4).
- **The dialogs and the menu (verified).** AddProducts and EditProduct rise over Home and sink back over it. Their
  surface is Home's, as in the web build: no edge is seen, only the content moving. The menu grows from its top
  right corner and shrinks back into it.
- **An interrupted movement (verified).** EditProduct, closed with Android's back button while it rose, sank from
  where it was, without jumping to the top first.
- **The tests (verified).** `bun test` cannot load Reanimated. The preload (`libs/testing/preload.test_support.ts`)
  replaces it, as it replaces React Native: `Animated.View` becomes its name, and the builders become values that
  the tests ignore.
- **The bundle (verified).** Worklets' plugin (`react-native-worklets/plugin`) is the last in `babel.config.cjs`.
  `bun run bundle` and `hermesc` compile it.

Not yet seen:

- **The feel at the real speed.** Each motion was seen in frames of the slowed builds. At 400 ms and 200 ms the
  screenshots catch only the end: whether they feel right is the owner's to judge, on the emulator or a phone.
- **"Remove animations"**, which should make every motion instant.
- **Two pages stacked in one frame.** The "Known gaps" item (EditProduct and AddProducts pushed together) gives
  two pages in the upper layer. The motion does not make it worse, but it shows it.
- **The release on `minSdkVersion`'s image.** Reanimated is a native module: the `android-release` skill asks for
  the pass on API 29 too.

## Later

Each of these is designed before it is drawn:

- the steps of AddProducts (shared axis X, from 2rem) and its scanner (rising, then its surface fading to show the
  camera);
- the snackbars (rising by 0.5rem and fading in, `short3`; fading out, `short2`);
- the rows of Home arriving and leaving, closing and opening their place;
- Home's top app bar, collapsing with the scroll (the "fixed viewport" of the known gaps), and its FAB's label;
- the product entering the fridge (`docs/product-flight.md`);
- Android's predictive back, which the web build never had.

## What to check in the emulator

On the reference screens of the `android-release` skill, in both themes: each page entering and leaving, by its
button and by Android's back button, at normal speed and in a build that slows the motion (a page's taps are then
easy to try while it leaves). Home under a page as it rises, and never a frame of the surface alone. The menu,
opened and closed by a tap on its item and on the scrim. Then with "Remove animations" on: every motion
instant.
