---
name: views
description: How Fridgy's views are written - TSX drawn by React Native as a pure function of the model, messages attached from the model, Material 3 through src/styles.ts (color roles, type scale, shapes, elevation, icons). Use when creating or editing a view.tsx, src/styles.ts or the palette.
---

# Views

Only `view.tsx` files hold TSX; React Native draws them through `#libs/tea-react`. A view is a pure function of
the model: no state, no hooks, no effects, no reading of the clock or of the platform. It is never a component:
React calls nothing of the app's but the root, which `#libs/tea-react/renderer.ts` makes, and every view below is
a function that returns elements.

## The model decides, the view draws

A view matches the model's tags and formats its values; it never decides. Before writing a condition in a view,
ask whether it reads a tag the model gives (`model.support._tag === 'NamingNothing'`: drawing) or computes one from
data (`model.digits === ''`, `choices.length === 0`, `text.trim().length > 0`, a fallback such as "the name, or
else the id": deciding). A decision moves to `makeModel`, as a case named for what the screen shows
(`Undated | Naming | NamingNothing`, `Loading | Loaded`, `ExpiringToday | ExpiringTomorrow | Fresh { inDays }`),
never as a boolean tag, and gets a property in `program.test.ts` ("the model", e.g. "says the date is undated,
names the days the digits name, or names nothing"). What stays in the view: texts, formatting (`formatDay`), styles
and layout, and matching two tags to one look (the date field, disabled while submitting and in the error's colors
when nothing is named). The model holds exactly what the view draws: a field no view reads is removed.

## Messages

- Attach the model's messages with `handlers(dispatch)` (`#libs/tea-react/tea-react.ts`), matching the model's
  case: `onPress={model.menu._tag === 'Closed' ? on(model.menu.open) : undefined}`. A view never builds a message:
  it sends what the model holds, and a control shown where `update` rejects its message is a bug the tests find.
  `onValue` builds a callback from a function the model holds, for what the callback carries (a field's text, a
  scroll's offset).
- A text field the user types into is uncontrolled: its text is `defaultValue`, read only when the field is
  created, and the program learns the text from `onChangeText`. A `value` written on every frame would take back
  the keys typed since that frame. To replace the text (a clearing, a scan), the model gives the field a new `key`.
  A field the program types into (the date the keypad fills) is no field: a `Text` in a field's frame.
- A parent's view hands each child's view its own dispatch, `Tea.dispatchTo(dispatch, '<Child>')`, and the
  child's model whole; it never reads the model's fields. The child draws its pieces where the parent leaves
  room (Products' list in Home, its subtitle and selection bar in Home's top app bar), or its whole screen (the
  root draws the page on top).
- An element keyed by what it shows (a snackbar, by what it tells; a field, by `nameKey`) is drawn anew when that
  changes. The root keys each page by its name: React reuses an element of the same type in the same place, and a
  page drawn in another's would keep its native views, and the text of their fields.
- A page draws itself whole: a `SafeAreaView` with the surface's color, keeping clear of the system bars (the app
  is drawn edge to edge), and a frame inside it, from which an absolute position is measured (a menu, a snackbar):
  an absolute position ignores the padding of its parent.

## Motion

The views of the web build moved. Of their motions, these draw the pages', the menu's, AddProducts' steps and scanner,
the snackbars and Home's rows (`docs/motion.md`); the rest is to come (`AGENTS.md`, "Known gaps"). A motion takes two choices, in this order:

- **Who drives it.** When the start, the end and the duration are known as the movement starts, and nothing can
  change them on the way, the platform interpolates, on the UI thread: an entering or exiting animation declared
  on the element (Reanimated's layout animations take one as a prop, which a pure view can give), on `transform`
  and `opacity`. The state keeps the phase ("in flight": AddProducts' `acknowledging`, Products' `presence`), never
  a position. When the state depends on time or on input while the movement runs (a spring that follows a finger, a
  physics, a destination that moves), the program drives it: a subscription sends `Tick({ delta })` on every frame,
  and `update` integrates it. The question is "is the destination known at the start?", never "can the platform be
  made to do it?".
- **What it says.** A motion tells what happened (a product entering the fridge, a row closing its place), and is
  designed once, in `docs/`, with its phases and durations, before it is drawn. Durations and curves are Material's
  tokens, named in `src/styles.ts`, never a number in a view. Android's "Remove animations" makes them instant, as
  Android's own are: Reanimated's default.

## Material 3

A control is the Material component that does its job, built to that component's spec (colors, size, shape,
elevation): a list of things is a list, not cards, where a tap opens an item, a long press selects it, and once
something is selected a tap selects too (Products' `maybeTap`); an action of the page is a FAB or a top app bar's
icon button; a secondary action is an item of the bar's overflow menu (a navigation drawer is for five or more
destinations); selected things turn the top app bar into a contextual one with their actions; something undone in
a few seconds (a deletion) gets a snackbar with its action, never a dialog; what only informs (a failure) is a
snackbar without an action, drawn by the page, never Android's toast; a choice among a few values is a segmented
button or a row of filter chips, the one taken drawn selected, and the action that commits a step is a filled
button where the thumb rests, whose label says what it does ("Add without date"), never a chip nor a key of the
keypad, which types the date and nothing else. An empty state is an icon on a 96dp disc in a role's container
colors (`primaryContainer` for what is merely missing, `errorContainer` for what could not be read), a
`headlineSmall` title and a `bodyLarge` text. Every top app bar is the surface's color at rest and
`surfaceContainer` once the page scrolls under it, with the emphasized title. A page that is opened over another
has a small bar, 64dp. A page is laid out for the reference screen, 320dp wide and 640dp between the system bars
(the `android-release` skill, "Supported screen sizes"): it fits the reference without scrolling, and a column that
docks a button at the bottom scrolls (`ScrollView`) when the screen is shorter than its content, as the keyboard or
a large font makes it. Everything is in `src/styles.ts` (`#styles`):

- colors are Material's roles (`color.primaryContainer`), Android's color resources of both schemes
  (`palette.generated.xml` in `values/` and `values-night/`), which Android picks by the system's theme, named by
  `PlatformColor`. They are generated from the key colors in `scripts/palette.ts`: change those and run
  `bun run update-palette`, never the generated files. What is drawn on a role takes its `on` role
  (`primaryContainer` under `onPrimaryContainer`); dimmed text is `onSurfaceVariant`; a disabled control's content
  is `disabledContent` and its container `disabledContainer` (on-surface at 38% and 12%, Material's). A view names
  the role and never a hex or a scheme: a change of the system's theme recreates the activity, which draws the same
  model again in the other scheme;
- text sizes are the type scale (`type.titleMedium`, `type.bodySmall`, `type.labelLarge`), in sp, which Android
  scales with the user's font size; radii the shape scale (`shape.medium`, `shape.full`); shadows the elevation
  levels (`elevation.level3`, a FAB's). A box that holds text has a minimum height and Material's padding, never a
  fixed height, so that a large font grows it;
- icons are Material Symbols, drawn by name (`icon('more_vert', color.onSurface)`), 24dp as they come: decoration,
  so the element that holds an icon carries the label (`accessibilityLabel='More options'`), and an icon beside a
  label adds nothing;
- what can be pressed is a `Pressable` with its role (`accessibilityRole='button'`) and its state
  (`accessibilityState={{ disabled, selected }}`).

A look that Material or the app fixes is written once in `src/styles.ts`, never in a component under `src/libs/`,
which knows nothing of the app. A line of layout stays in the view, written twice where two views draw it (the
keypad of the two pages that take a date).

## Checking

The program's `program.test.ts` draws the real view for arbitrary states and checks, with `dispatchViolations` and
`messagesSentBy` (`#libs/tea-react/view.test_support.ts`), that every message it sends is accepted and that nothing
the user could ask for is missing (see the `add-program` skill). What it looks like is seen in the emulator (the
`android-release` skill): build, install, and look at each state the change touches, on the reference screen and at
200%.
