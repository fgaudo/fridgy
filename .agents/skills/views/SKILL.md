---
name: views
description: How Fridgy's views are written - TSX drawn by React Native as a pure function of the model, messages attached from the model, Material 3 through src/styles.ts (color roles, type scale, shapes, elevation, icons). Use when creating or editing a view.tsx, src/styles.ts or the palette, or how a page keeps clear of the keyboard.
---

# Views

Only `view.tsx` files and the entrypoint that mounts React hold TSX; React Native draws the views through
effect-tea's bridge to React (`@fgaudo/effect-tea/react`). A view is a pure function of the model: no state, no
hooks, no effects, no reading of the clock or of the platform. It is never a component: React calls nothing of
the app's but `Root`, which `#libs/tea-react/renderer.ts` makes, and every view below is a function that returns
elements. `Root` draws the app with the bridge's `Draw`, inside an error boundary that gives what a view throws to
`app.die`, or the screen a crash leaves in its place.

## The model decides, the view draws

A view matches the model's tags and formats its values; it never decides. Before writing a condition in a view,
ask whether it reads a tag the model gives (`model.strip._tag === 'NamingNothing'`: drawing) or computes one from
data (`model.digits === ''`, `choices.length === 0`, `text.trim().length > 0`, a fallback such as "the name, or
else the id": deciding). A decision moves to `makeModel`, as a case named for what the screen shows
(`Hint | Naming | NamingNothing`, `Loading | Loaded`, `ExpiringToday | ExpiringTomorrow | Fresh { inDays }`),
never as a boolean tag, and gets a property in `program.test.ts` ("the model", e.g. "shows the digits as typed; the
strip the hint while they name no day yet, the days they name with the one named, or that no more digits can name
one"). What stays in the view: texts, formatting (`formatDay`), styles
and layout, and matching two tags to one look (the date field, disabled while submitting and in the error's colors
when nothing is named). The model holds exactly what the view draws: a field no view reads is removed.

## Messages

- Attach the model's messages with `handlers(dispatch)` (`#libs/tea-react/tea-react.ts`), matching the model's
  case: `onPress={model.menu._tag === 'Closed' ? on(model.menu.open) : undefined}`. A view never builds a message:
  it sends what the model holds, and a control shown where `update` rejects its message is a bug the tests find.
  A dispatch applies its message before it returns: when a callback returns, `update` has seen it.
- What a callback carries (a field's text, a scroll's offset, a layout's height) fills a message the model holds
  without its value:
  `onScroll={(event) => dispatch({ ...model.scrolled, offset: event.nativeEvent.contentOffset.y })}`. The view
  copies the value as the element gives it: it combines none, compares none and converts none.
- A text field the user types into is uncontrolled: its text is `defaultValue`, read only when the field is
  created, and the field sends its text from `onChangeText`, filling the model's `nameTyped`. A `value` written on
  every frame would take back the keys typed since that frame: React Native's field tells the program of a key
  after it has shown it, and effect-tea's bridge promises nothing of what a controlled `TextInput` shows until its
  native view takes the value of its model. To replace the text (a
  clearing, a scan), the model gives the field a new `key`. A field the program types into (the date the keypad
  fills) is no field: a `Text` in a field's frame.
- A parent's view hands each child's view its own dispatch, `Tea.forwardTo(dispatch, '<Child>')` (with its id
  for a child by id), and the child's model whole; it never reads the model's fields. The child draws its pieces
  where the parent leaves room (Products' list in Home, its subtitle and selection bar in Home's top app bar; the
  date's controls in a step of AddProducts), or its whole screen (the root draws the page shown). A child without
  a view (the snackbar) is drawn by its parent's view from its model, which the parent's model holds.
- An element keyed by what it shows (a snackbar, by its `id`; a field, by `nameKey`) is drawn anew when that
  changes. The root keys each page by its name and its instance, which each visit has anew: React reuses an element
  of the same type in the same place, and a page drawn in another's, or in an earlier visit's, would keep its
  native views, and the text of their fields. `AddProducts` keys its date by its instance likewise.
- A page draws itself whole: a `SafeAreaView` with the surface's color, keeping clear of the system bars (the app
  is drawn edge to edge), and a frame inside it, from which an absolute position is measured (a menu, a snackbar):
  an absolute position ignores the padding of its parent.
- A page with a field keeps clear of the keyboard itself, so that what is docked at the bottom stays in sight.
  The window of an app drawn edge to edge is never resized, whatever `windowSoftInputMode` asks for. The page
  observes the platform's `Keyboard` (`src/infrastructure/keyboard`, the subscription keyed `keyboard`) and holds
  how far it covers the window (`keyboardInset`), which is the `SafeAreaView`'s `paddingBottom`, on a `bottom` edge
  in `maximum` mode. The inset is the window's own and covers the navigation bar, so the page keeps clear of the
  larger of the two, never of their sum. It is read from the window's insets, by
  `react-native-keyboard-controller`: React Native's own keyboard events come from the root view's layout passes,
  and a root view made anew, as an activity recreated gives, tells nothing of a keyboard that was up. The inset is
  told as the keyboard starts to move, never once it has: a keyboard sliding away covers the page it leaves, and
  one told late leaves the page's bottom in mid-air.

## Motion

The motions are told in `docs/motion.md`, and the product entering the fridge in `docs/product-flight.md`. A motion
takes two choices, in this order:

- **Who drives it.** When the start, the end and the duration are known as the movement starts, and nothing can
  change them on the way, the platform interpolates, on the UI thread: an entering or exiting animation declared
  on the element (Reanimated's layout animations take one as a prop, which a pure view can give), on `transform`
  and `opacity`. The state keeps the phase ("open", "closing": AddProducts' `Fridge`, Products' `presence`), never
  a position. When the state depends on time or on input while the movement runs (a spring that follows a finger, a
  physics, a destination that moves), the program drives it: a subscription sends `Tick({ delta })` on every frame,
  and `update` integrates it. The question is "is the destination known at the start?", never "can the platform be
  made to do it?".
- **What it says.** A motion tells what happened (a product entering the fridge, a row closing its place), and is
  designed once, in `docs/`, with its phases and durations, before it is drawn. Durations and curves are Material's
  tokens, named in `src/styles.ts` (the durations from `src/libs/material/durations.ts`, which a program's timer
  that waits for a motion uses too), never a number in a view or a timer. Android's "Remove animations" makes them instant, as
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
  fixed height, so that a large font grows it: an outlined field's label is in the flow, above its text. A shape whose
  size Material fixes (the 40dp disc of a product) keeps its text at its size instead (`allowFontScaling={false}`),
  as an icon does, when text that grows says the same (the row's supporting text);
- icons are Material Symbols, drawn by name (`icon('more_vert', color.onSurface)`), 24dp as they come, whatever the
  font, as Android's own: decoration, so the element that holds an icon carries the label
  (`accessibilityLabel='More options'`), and an icon beside a label adds nothing;
- what can be pressed is a `Pressable` with its role (`accessibilityRole='button'`) and its state
  (`accessibilityState={{ disabled, selected }}`).

A look that Material or the app fixes is written once in `src/styles.ts`, never in a component under `src/libs/`,
which knows nothing of the app. A line of layout stays in the view, written twice where two views draw it (the
snackbar, which each page that has one places over its own controls).

## Checking

The program's `program.test.ts` draws the real view for arbitrary states and checks, with `dispatchViolations` and
`messagesSentBy` (`#libs/tea-react/view.test_support.ts`), that every message it sends is accepted and that nothing
the user could ask for is missing (see the `add-program` skill). What it looks like is seen in the emulator (the
`android-release` skill): build, install, and look at each state the change touches on the reference screen, where the
app is developed, and, when the change touches layout or text, on the worst case, at 200%.
