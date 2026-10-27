---
name: views
description: How Fridgy's views are written - TSX rendered by snabbdom, messages attached from the model, Material 3 through the theme's color roles, type scale, shapes and elevation. Use when creating or editing a view.tsx, src/styles.css or the palette.
---

# Views

Only `view.tsx` files hold TSX; snabbdom renders them through `#libs/jsx` and `#libs/tea-snabbdom`. A view is a
pure function of the model: no local state, no effects, no reading of the clock.

## The model decides, the view draws

A view matches the model's tags and formats its values; it never decides. Before writing a condition in a view,
ask whether it reads a tag the model gives (`model.date._tag === 'NamingNothing'`: drawing) or computes one from
data (`model.digits === ''`, `choices.length === 0`, `text.trim().length > 0`, a fallback such as "the name, or
else the id": deciding). A decision moves to `makeModel`, as a case named for what the screen shows
(`Undated | Naming | NamingNothing`, `Loading | Loaded`, `ExpiringToday | Fresh { daysLeft }`), never as a boolean
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
  never from `props.value`: a frame older than the last keys would take them back.
- A parent's view hands each child's view its own dispatch, `Tea.dispatchTo(dispatch, '<Child>')`, and the
  child's model whole; it never reads the model's fields. The child draws its pieces where the parent leaves
  room (Products' list in Home, its subtitle and selection bar in Home's top app bar), or its whole screen
  (the root draws the page on top). A model that rarely changes is drawn with snabbdom's `thunk`.
- An element that animates in and out takes a `key` and snabbdom's `style` hooks (`delayed`, `remove`), as
  Home's side menu does.

## Material 3

A control is the Material component that does its job, built to that component's spec (colors, size, shape,
elevation): a list of things is a list, not cards; an action of the page is a FAB or a top app bar's icon
button; a form that opens over the page is a modal bottom sheet, within the thumb's reach, with outlined text
fields; selected things turn the top app bar into a contextual one with their actions. The theme leaves out
Tailwind's own colors, font sizes, radii, shadows, easings and durations:

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
  modal or a menu is `scrim`, both in `src/styles.css`;
- motion is Material's easing curves (`ease-standard`, `ease-emphasized-decelerate`) and durations
  (`duration-short-3`, `duration-medium-4`), in `src/styles.css`. A simple change (a color, an elevation, a size)
  takes the standard curve over `short-4`, the default of the `transition-*` utilities. What enters decelerates,
  emphasized, over `medium-4`, and what leaves accelerates over `short-4`: an element inserted and removed sets
  its `transition` in snabbdom's `delayed` and `remove` styles, with `var(--transition-duration-medium-4)` and
  `var(--ease-emphasized-decelerate)`, never a number of milliseconds or a `cubic-bezier`;
- icons are `material-symbols-rounded` spans; the safe areas are the `sait`, `saib`, `sail`, `sair` spacings
  (`pt-sait`, `mr-sair`).

A look that Material or the app fixes (a utility in `src/styles.css`) is written once there, never in a component
under `src/libs/`, which knows nothing of the app: `src/libs/ui/` holds only `cn`, which joins class names.

## Checking

The development server (`bun run watch`) swaps the view in place when only `.tsx` and `.css` files change,
keeping the application state. The program's `program.test.ts` renders the real view for arbitrary states and
checks, with `dispatchViolations` and `messagesSentBy`, that every message it sends is accepted and that nothing
the user could ask for is missing (see the `add-program` skill).
