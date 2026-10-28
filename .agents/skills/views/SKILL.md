---
name: views
description: How Fridgy's views are written - TSX rendered by snabbdom, messages attached from the model, motion driven by CSS or by a tick, Material 3 through the theme's color roles, type scale, shapes and elevation. Use when creating or editing a view.tsx, src/styles.css or the palette.
---

# Views

Only `view.tsx` files hold TSX; snabbdom renders them through `#libs/jsx` and `#libs/tea-snabbdom`. A view is a
pure function of the model: no local state, no effects, no reading of the clock.

## The model decides, the view draws

A view matches the model's tags and formats its values; it never decides. Before writing a condition in a view,
ask whether it reads a tag the model gives (`model.support._tag === 'NamingNothing'`: drawing) or computes one from
data (`model.digits === ''`, `choices.length === 0`, `text.trim().length > 0`, a fallback such as "the name, or
else the id": deciding). A decision moves to `makeModel`, as a case named for what the screen shows
(`Undated | Naming | NamingNothing`, `Loading | Loaded`, `ExpiringToday | ExpiringTomorrow | Fresh { inDays }`), never as a boolean
tag, and gets a property in `program.test.ts` ("the model", e.g. "says the date is undated, names the days the
digits name, or names nothing"). What stays in the view: texts, formatting (`formatDay`), classes and layout,
and matching two tags to one look (the date field, disabled while submitting and in the error's colors when
nothing is named). The model holds exactly what the view draws: a field no view reads is removed.

## Messages

- Attach the model's messages with `handlers(dispatch)` (`#libs/tea-snabbdom/tea-snabbdom.ts`), matching the
  model's case: `on={menu._tag === 'Closed' ? on('click', menu.open) : {}}`. A view never builds a message: it
  sends what the model holds, and a control shown where `update` rejects its message is a bug the tests find.
- `onPreventingDefault` is the exception that always attaches (the native menu of a long press), with an
  optional message.
- An input the user types into gets its text with `initialValue` (written only when the input is created),
  never from `props.value`: a frame older than the last keys would take them back, and its focus with
  `focusOnInsert` (once, when it enters the document): to write or focus again, the model gives it a new `key`.
  An input the program types into (the date the keypad fills, read-only) takes `props.value`, as any other text
  of the model.
- A parent's view hands each child's view its own dispatch, `Tea.dispatchTo(dispatch, '<Child>')`, and the
  child's model whole; it never reads the model's fields. The child draws its pieces where the parent leaves
  room (Products' list in Home, its subtitle and selection bar in Home's top app bar), or its whole screen
  (the root draws the page on top). A model that rarely changes is drawn with snabbdom's `thunk`.
- An element that animates in and out takes a `key` and snabbdom's `style` hooks (`delayed`, `remove`), as
  Home's menu does. The hooks run on the element removed, not on its children: a piece a parent places (Products'
  snackbar in Home) is drawn in a slot that is always there. A page's view keys its root by the page's name
  (`key='About'`): the root draws the page on top with no wrapper, so that the page replaced leaves with its own
  `remove` transition, letting nothing through (`pointerEvents: 'none'`), over the next page (`z-70`) or under it
  (Home, held until the next page's entrance is over).
- A page is drawn anew each time it comes back on top, so an entrance in `delayed` plays on every return. An
  element that enters because something changed (a row added or put back), not because the page is drawn, gets
  its entrance from the model (Products' `presence`, `Arriving`; AddProducts' `acknowledging`), which the state keeps until a timer, running
  only while the page is on top, says it has been shown. An element keyed by what it shows (a snackbar, by its
  deletion) is replaced by the next one while it leaves, the two drawn at once in the same place: the model
  says that the next comes after another (its `entrance`), and the view delays its entrance (`transitionDelay`)
  by the exit's duration, resetting the delay in `remove`. A list's rows leave the same way (`Leaving`), kept by
  the state where they were until they have closed their place: a row removed with a `remove` transition stays
  in the DOM, and snabbdom moves the rows around it when others go too, which jumps them over it. A list's rows
  leave by closing their place (`height` and `opacity`, overflow hidden), and arrive by opening it; a row that
  leaves has no `remove` style, whose transition would never end on a place already closed. What replaces the
  whole list (an empty state) leaves with `remove`, out of the flow (`position: absolute`), over what takes its
  place.

## Motion

Two choices, taken in this order: the first decides almost everything, the second is the view's.

- **Who drives it.** When the start, the end and the duration are known as the movement starts, and nothing can
  change them on the way, the browser interpolates: a CSS transition or `@keyframes`, on `transform` and
  `opacity` only. The compositor runs those on its own thread, so a write to the storage that holds the main
  thread does not stutter them; `height`, `top` or a color go back to the main thread every frame. The state
  keeps the phase ("in flight": AddProducts' `acknowledging`, Products' `presence`), never a position: that is
  every motion of the app today. When the state depends on time or on input while the movement runs (a spring
  that follows a finger and is released, a physics, objects that interact, a destination that moves), the
  program drives it: a subscription sends `Tick({ delta })` on every animation frame (`#libs/animation-frame`),
  the delta from the previous frame's timestamp, which the subscription keeps, and `update` integrates it
  (position by velocity by delta). The position is then state of its own, not derived data, and the time elapsed
  is summed only when something reads it. The question is "is the destination known at the start?", never "can
  CSS be made to do it?": the second leads to acrobatics of keyframes, the first cuts clean.
- **Where it is drawn.** A few objects that must be real elements (pressable, read by a screen reader, colored
  by a role) are DOM, under a tick too: a drag runs on the main thread anyway, with its input. Many objects, or
  purely decorative ones, are a 2D `<canvas>`: the view gives the scene as data on the vnode and a `postpatch`
  hook draws it, so the view stays pure and the program knows of no canvas. The canvas issues its commands
  from JavaScript, on the main thread, like any tick; WebGL only when 2D cannot. The two choices cross freely:
  a tick may move a `div` by `transform`, and a canvas drawn once may be moved by CSS.
- A choreography of movements in sequence, the destination known at the start (AddProducts' name becoming a
  product that flies into the fridge, whose door opens and closes over it), is `@keyframes` in `src/styles.css`,
  each phase's delay a sum of the phases before it (named durations on `:root`, of the tokens), played by
  utilities there on keyed elements that play them when inserted. Two animations of one property on one element
  go in one utility, the later overriding the earlier from its delay on; an element that must pass behind another
  is handed, at that moment, to a copy drawn there. Geometry the layout does not fix (where a text is and each of
  its letters, where the fridge is) is measured once, in an `insert` hook (`gatherAndFly`, `#libs/tea-snabbdom`),
  and given to the keyframes as custom properties: never on every frame, and never by the program, which learns
  no numbers. Text animated by its letters is split with `piecesOf` (`#libs/strings/pieces.ts`), by word in a
  script whose letters join. Under `prefers-reduced-motion` the movements become fades, in each utility's media
  query.
- A motion the program drives is a child of its own, drawn by its parent with `thunk`, so that a tick redraws
  only its subtree. Its durations are constants of the program, named after the tokens of `src/styles.css` they
  match, not numbers in the view. `prefers-reduced-motion` has a branch in both: a media query in CSS, a phase
  that jumps to the end under a tick.

## Material 3

A control is the Material component that does its job, built to that component's spec (colors, size, shape,
elevation): a list of things is a list, not cards, where a tap opens an item, a long press selects it, and
once something is selected a tap selects too (Products' `maybeTap`); an action of the page is a FAB or a top app bar's icon
button; a secondary action is an item of the bar's overflow menu (a navigation drawer is for five or more
destinations); a form that opens over the page is a modal bottom sheet, within the thumb's reach, with outlined
text fields; selected things turn the top app bar into a contextual one with their actions; something undone in
a few seconds (a deletion) gets a snackbar with its action, never a dialog; what only informs is a toast; a
choice among a few values is a row of filter chips, the one taken drawn selected, and the action that commits
a step is a filled button where the thumb rests, whose label says what it does ("Add without date"),
never a chip nor a key of the keypad, which types the date and nothing else. A chip
or a button that does nothing is text. An empty state is an icon on a 96dp disc in a role's container colors
(`primary-container` for what is merely missing, `error-container` for what could not be read), a `headline-small`
title and a `body-large` text. Every top app bar is the surface's color at rest and `surface-container` once the
page scrolls under it, which the page learns from its scroll (Home from its `Viewport`, About from its own
scroll event), with the emphasized title. A page that is opened over another has a small bar, 64dp; Home, the
app's own screen, has a medium one: a 124dp bar with the row of its icons on top and the headline
(`headline-medium-emphasized`) with its subtitle at the bottom, which collapses to the small bar, the headline
shrunk to `title-large-emphasized` after the leading icon, once the list scrolls under it. The contextual bar of
the selected products takes the same shape, in its own colors: the child gives Home its pieces (the icon
buttons, the title), and Home draws them in its bar. The list leaves the bar's full height above itself. Pages
come and go with Material's transitions, symmetric: what enters decelerates, what leaves accelerates. A page is laid
out for the reference screen, 320dp wide and 640dp between the system bars (the `android-release` skill,
"Supported screen sizes"): it fits the reference without scrolling, and a column that docks a button at the
bottom scrolls (`overflow-y-auto`) when the screen is shorter than its content, as the keyboard or a large font
makes it. The theme leaves out Tailwind's own
colors, font sizes, radii, shadows, easings and durations:

- colors are Material's roles (`src/palette.generated.css`, generated from the key colors in
  `scripts/palette.ts`: change those and run `bun run update-palette`, never the generated file). What is
  drawn on a role takes its `on-` role (`bg-primary-container text-on-primary-container`); dimmed text is
  `text-on-surface-variant`; an opacity only where Material sets one (a disabled control, 38%; the scrim, 32%).
  Every role has a light and a dark value, picked by the system's theme (`prefers-color-scheme`): a view names
  the role and never the theme, so no `dark:` variant and no color of its own;
- text sizes are the type scale (`text-title-medium`, `text-body-small`, `text-label-large`), radii the shape
  scale (`rounded-medium`, `rounded-full`), shadows the elevation levels (`shadow-elevation-3`, a FAB's), all
  in `src/styles.css`. A surface's level is its component's, and a raised surface takes its tone from its
  container role (`bg-surface-container-low` for a drawer), not from a shadow alone;
- what can be pressed carries `state-layer`, Material's feedback on hover, focus and press; the layer behind a
  modal or a menu is `scrim`, both in `src/styles.css`. A component of Material's that more than one view draws,
  with its states, is a utility there too, its state an attribute it reads (`filter-chip` and `segment`, selected
  by `aria-pressed`): a copy of its classes changed on its own would be a bug. A line of layout stays inline,
  written twice (a key of the keypad);
- motion is Material's easing curves (`ease-standard`, `ease-emphasized-decelerate`) and durations
  (`duration-short-3`, `duration-medium-4`), in `src/styles.css`. A simple change (a color, an elevation, a size)
  takes the standard curve over `short-4`, the default of the `transition-*` utilities. What enters decelerates,
  emphasized, over `medium-4`, and what leaves accelerates over `short-4`: an element inserted and removed sets
  its `transition` in snabbdom's `delayed` and `remove` styles, with `var(--transition-duration-medium-4)` and
  `var(--ease-emphasized-decelerate)`, never a number of milliseconds or a `cubic-bezier`;
- an icon is a ligature, a word that a screen reader would read: an icon button is named by an `aria-label`
  (its `title` too, for the pointer), and an icon beside a label is `aria-hidden`;
- icons are `material-symbols-rounded` spans, 24dp as they come, `icon-large` (48dp, at its optical size) for an
  empty state's, `icon-filled` for a selected state's; the safe areas are the `sait`, `saib`, `sail`, `sair`
  spacings (`pt-sait`, `mr-sair`). A bar that pads for an inset keeps its height with `box-content`: with the
  default box sizing the padding eats into it. The user's font size (up to 200%) scales text and no length but
  `lh`: a box that must hold scaled text (Products' avatar, the FAB's label) takes its size in `lh`, and a fixed
  height a label may wrap under is a `min-h-*`.

A look that Material or the app fixes (a utility in `src/styles.css`) is written once there, never in a component
under `src/libs/`, which knows nothing of the app: `src/libs/ui/` holds only `cn`, which joins class names.

## Checking

The development server (`bun run watch`) swaps the view in place when only `.tsx` and `.css` files change,
keeping the application state. The program's `program.test.ts` renders the real view for arbitrary states and
checks, with `dispatchViolations` and `messagesSentBy`, that every message it sends is accepted and that nothing
the user could ask for is missing (see the `add-program` skill).
