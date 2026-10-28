# Design: searching the list

Designed on 2026-10-28, not implemented yet: this document is the plan, to be turned into code and then pruned to
the design, the facts verified and the decisions, as `edit-product.md` was. The code it touches is Home's child
`src/app/children/home/children/products/` (the query, the rows shown, the selection), Home's view
`src/app/children/home/view.tsx` (the top app bar in its search mode) and a new module of `src/libs/strings/` (the
matching rule). Read [`AGENTS.md`](../AGENTS.md), the `add-program` and `views` skills and the "Guide" of
`node_modules/@fgaudo/effect-tea/README.md` before changing them. The facts about the code below marked
**verified** were checked against the tree on 2026-10-28; re-check them before relying on them.

## What it does

A search icon in Home's top app bar turns the bar into a search field. As the user types, the list shows only
the products whose name contains what was typed, at once, with no request and no delay; the rest of Home keeps
working on the rows shown: a tap opens a product, a long press selects, the contextual bar deletes, the snackbar
undoes. The back button, the bar's arrow or clearing the field bring the full list back. Out of scope: filtering
by expiration (chips for "expired", "expiring soon", "never expires"), searching other fields than the name,
sorting, highlighting the match in a row, remembering the last search across launches, and a search on the pages
that add or edit a product (see "Later").

## Decisions

Taken on the owner's request for a simple design; the reasons and the alternatives are in "Open points, and
what was decided".

1. **The filter is pure and in memory.** The list is a fridge's, tens of rows: the rows shown are computed from
   the stored list and the query in `makeModel`, as derived data is. No service, no command, no subscription
   searches: there is no request that a deletion could overlap with, and nothing to debounce or cancel.
2. **The query belongs to `Products`**, Home's child, not to Home. Which rows are shown, how many, which can be
   selected and what "nothing here" means are the list's concerns; Home only draws, in its bar, the pieces the
   child gives it, as it draws the selection's bar and the subtitle today.
3. **The selection locks the search.** While products are selected or being deleted, the contextual bar takes
   the top app bar's place and the search field with it: the query cannot change, the search cannot open or
   close, until the selection is cleared or the deletion is over. This is the only concurrency rule needed:
   every selected row is a row shown, by construction (see "Concurrency").
4. **A keystroke moves no row.** Typing redraws the list at once, without the entrance and exit of rows that a
   change of the storage plays: a filter that changed on every keystroke, with its rows opening and closing
   their places, would never be still. The storage's changes (a deletion, an undo, a product added) keep their
   motion, among the rows shown.
5. **The search stays open under another page.** Opening a product from the filtered list and coming back shows
   the same search; so does adding a product. The query is state of the page, kept in the root's stack like the
   rest of it.
6. **Matching is by name, forgiving on case and accents**, every word typed somewhere in the name, in any order.
   The rule knows nothing of products and lives in `src/libs/strings/`.

## The user's experience

1. **Opening.** Home's bar, at rest, shows the headline "Fridgy", the subtitle "7 items" and, in its row of
   icons, a search icon button before the overflow menu's. The search icon is there only while there are
   products to search: not while the list loads, failed to load, or is empty. A tap turns the bar into Material's
   search view, docked: the bar collapses to its small height (64dp, `surface-container`, whatever the scroll),
   holding a leading back arrow, the field with the placeholder "Search products", and nothing trailing. The
   field is focused on creation, so the keyboard is up; the list moves up under the shorter bar, the rows where
   they were.
2. **Typing.** Each keystroke redraws the list with the rows whose name matches, instantly, in the order the
   list has (by expiration). A trailing clear button (`close`) appears while the field has text. The subtitle is
   not drawn in the search bar, which has no room for it; the contextual bar, which has, says "2 of 7 items"
   while a filter is on (see 4). Rows without a name (stored data that cannot be read) never match, so they are
   hidden while a filter is on and come back with the full list. A query of spaces alone filters nothing.
3. **Nothing matches.** When no product's name matches, the list's place shows an empty state of its own: the
   `search_off` icon on a `primary-container` disc, the title "No products match" and the text "Try a shorter
   name, or add the product with the button below.". The add button stays through the search: not finding a
   product is the moment to add it. When the storage itself is empty, the usual "Nothing in the fridge" is shown
   under the search bar, since there is nothing to match.
4. **Selecting and deleting.** A long press on a row shown selects it, and the contextual bar replaces the
   search bar, as it replaces the normal bar today: "2 selected", clear and delete, over the list still
   filtered; its subtitle says "2 of 7 items". The query cannot be touched until the selection ends. Clearing
   the selection brings the search bar back, the query as it was, the field created anew and so focused again,
   the keyboard with it (see "Open points"). Deleting plays as today: the rows close their place where they are
   among the rows shown, the contextual bar says "Deleting…" until the storage answers, then the search bar is
   back and the snackbar offers to undo. An undo puts the products back; those that match arrive in their place,
   those that no longer match (the query changed meanwhile) are back but hidden.
5. **Opening a product.** A tap on a row shown opens the page that edits it. On return, a product renamed so
   that it no longer matches is no longer in the list; one whose expiration changed is in its new place. Neither
   move is animated, as today's move after an edit is not.
6. **Closing.** The back arrow, the back button and nothing else close the search: the query is forgotten, the
   full list is back at once, the bar grows back to its medium height when the list is at the top. The clear
   button empties the field and keeps the search open, the field focused again. Pressing the keyboard's search
   key does nothing: the list already shows the matches (see "Open points" for the keyboard).

## The program: `Products` (`src/app/children/home/children/products/program.ts`)

One more state machine, beside the list, the selection and the last deletion:

```ts
type Search = Data.TaggedEnum<{
  Closed: object
  /** `inputKey` changes each time the program empties the field, so that the input is drawn anew (and focused). */
  Open: Readonly<{ query: string; inputKey: number }>
}>
```

- **The query is the text as typed**, never trimmed or folded in the state: the input owns it while the user
  types, and `update` accepts it whatever it is (the Guide: input is never a reason to reject). What it filters
  by is derived: `TextSearch.fromString(query)`, `None` for a blank query, which filters nothing.
- **Messages**, from the view unless said otherwise: `SearchOpened`, `SearchClosed`, `QueryChanged { query }`,
  `QueryCleared`, and `BackPressed` from the back button's subscription.
- **`update`:**
  - `SearchOpened`: accepted while the search is `Closed`, the list is `Loaded` with at least one item and the
    selection is `Idle`; otherwise rejected (the icon is withheld). Opens with an empty query.
  - `QueryChanged`: accepted while `Open` and `Idle`: stores the text. Rejected while a selection exists (see
    "Concurrency": the field is not on screen then).
  - `QueryCleared`: accepted while `Open`, `Idle` and the query has text (the clear button is withheld on an
    empty field): empties the query and bumps `inputKey`.
  - `SearchClosed` and `BackPressed`: accepted while `Open` and `Idle`: `Closed`. `BackPressed` outside those
    states is a defect, since its subscription runs only in them.
  - `ItemSelected` and `EditRequested` take only an id among the **rows shown**: a listed item whose name matches
    the filter (`shownIds`, in place of today's `selectableIds`; **verified**: today's rule already rejects an id
    the storage has removed, so a tap on a row that a keystroke has since hidden becomes one more such case).
  - `ListChanged` keeps in the selection the ids that still exist **and are still shown**, in place of today's
    "still exist" (**verified** in `ListChanged`: the selection is intersected with the new ids, a deletion in
    progress left alone). Nothing writes a name while Home is on top today, so no change can hide a selected
    row; the rule makes the invariant hold whatever a future writer does.
  - Nothing else changes: the selection, the deletion, the undo, the arrivals and departures are computed on the
    whole stored list, as today.
- **`makeModel`:** the rows are `rowsOf(list)`, the whole list in order with the rows leaving where they were,
  **then** filtered by the query on each row's name (`Valid`: `product.name`; `Invalid`: `maybeName`;
  `Corrupt`: its `maybeName` too). Filtering after placing keeps a leaving row right after the last row shown
  that preceded it, even when the row it followed is hidden (`maybeAfter` names a row of the whole list;
  **verified** in `rowsOf`: an anchor not found puts the row first, which would be wrong among the rows shown).
  The list model gains a case: `NoMatches` when a filter is on and no **item** matches (rows only leaving go
  with the list's fade, as the last rows do today when the storage empties); `Empty` stays the storage's, and
  wins. `Available` gains `maybeMatching: Option<PositiveInteger>`, the count of items matching while a filter is
  on, for the subtitle "2 of 7 items"; `total` stays the stored count. The model gains:

  ```ts
  search: Data.TaggedEnum<{
    /** `maybeOpen` while there are products to search and nothing is selected. */
    Closed: { maybeOpen: Opt.Option<Message> }
    Open: {
      query: string
      inputKey: number
      change: (query: string) => Message
      maybeClear: Opt.Option<Message>
      close: Message
    }
    /** Open, under the contextual bar: nothing of it is drawn, nothing of it can be sent. */
    Covered: object
  }>
  ```

- **Subscriptions:** the back button, keyed `back-button`, while the search is `Open` and the selection `Idle`.
  The key leaves the map when a selection starts, so the button is the platform's again meanwhile, as it is
  today while selecting, and comes back when the selection ends. `Deps` gains `BackButton`; `layer.ts` does not
  change (**verified**: the entrypoints provide the back button's adapter, which Home already lists).
- **Performance:** the names are folded on every frame the renderer reads, once per row: a normalization and a
  regular expression per name, for tens of rows. Keeping the folded names in the state would be derived data,
  and is not worth a rule's exception at this size; should a fridge of hundreds stutter while typing, fold them
  in `ListChanged` as part of the item, when the list changes, not the query.

## Home: the bar's three shapes (`src/app/children/home/view.tsx`)

The top app bar already has two shapes: the medium bar of the page, collapsing to the small one once the list
scrolls under it, and the contextual bar of the selection, drawn from the pieces `Products` gives
(`selectionBar`, `subtitle`; **verified**). The search adds a third, from two more pieces of `Products`:

- `searchButton(model, dispatch)`: the icon button that opens the search, or nothing (`Closed` without
  `maybeOpen`, `Open`, `Covered`). Home draws it in the icon row, before the overflow button.
- `searchBar(model, dispatch)`: the field's row, or nothing: the leading `arrow_back` icon button (`close`), the
  `input` (`type: 'search'`, `enterKeyHint: 'search'`, `autocapitalize: 'none'`, `autocomplete: 'off'`, no
  outline, `body-large`, `caret-primary`, its text written with `initialValue` and focused with `focusOnInsert`,
  keyed by `inputKey`, `onValue('input', change, inputValue)`) and the trailing `close` icon button while
  `maybeClear` is `Some`.

Home picks the shape in this order: the selection's bar, then the search bar, then its own. In search mode the
bar is `h-16` and `surface-container` whatever `isAtTop`, the headline and subtitle block is not drawn, and the
overflow button is not there: the menu cannot open while the search is open, and the search cannot open while
the menu is (its tap catcher takes the tap), so the two observers of the back button from Home never coexist;
should they, a press goes to the last one to start observing (**verified** in `observed`,
`src/infrastructure/back-button/back-button.ts`: a `Set` in insertion order, `.at(-1)`), which closes what
opened last. `Products.list` reads the model to pad the list by the bar's height: `pt-16` in search mode,
`pt-31` otherwise, with `transition-[padding]` so that the rows follow the bar as it shrinks and grows (the bar
already transitions its height; **verified**: `transition-[height]` on the bar, `pt-31` on the list's `div`).

Home's `program.ts` does not change. Its view test's `withheld` gains the cases the model hides on purpose: the
menu while the search is open (the overflow button is not drawn), the search's messages while a selection
exists, and the rows hidden by the filter, which are not drawn.

## The matching rule (`src/libs/strings/text-search.ts`)

Generic, knowing nothing of products: a `Query` is a branded non-empty array of folded words, made by
`fromString(text): Option<Query>` (`None` for a text with no word), and `matches(query)(text): boolean` holds
when every word of the query is a substring of the folded text. Folding is NFD, the combining marks removed
(`\p{M}`), then `toLowerCase()`: "cafe" finds "Café", "LATTE" finds "Latte intero", "int lat" finds it too. A
word is a run of what `\s+` does not split; the fold keeps digits and punctuation, so "h₂o" is typed as stored
(NFC keeps `₂`, **verified** in `NormalizedString`'s tests). Properties to test: a text matches itself and any
one of its words; matching is unchanged by the case and the accents of either side; the empty and the blank
query are `None`; a query of two words matches in either order. `src/README.md` names the module under `libs/`.

Not in the domain: `Product.name` is one field the rule applies to, and `Invalid` rows apply it to a bare
string; a `Product.matches` would be a one-line alias with nothing of the domain in it.

## Concurrency

There is no asynchronous search: the filter is a pure function of two pieces of state, so no answer can arrive
late and nothing needs cancelling. What remains is the query changing while the selection and the deletion act
on the rows, and the storage changing under both. The rule, in one table (the search's controls per state of the
selection):

| selection \ search | `Closed`                              | `Open`                                            |
| ------------------ | ------------------------------------- | ------------------------------------------------- |
| `Idle`             | search icon in the bar; whole list    | field, clear, close, back button; filtered list   |
| `Selecting`        | contextual bar, no search icon        | contextual bar over the field (`Covered`); frozen |
| `Deleting`         | contextual bar, "Deleting…", disabled | the same, until the deletion completes            |

- **The invariant: every selected id names a row shown.** It holds at every step: `ItemSelected` takes only a
  row shown; `ListChanged` drops from the selection what is no longer shown; the query cannot change while a
  selection exists; the search cannot open or close while one exists (closing would only widen the rows shown,
  but a rule with no exception is easier to test). So "Delete" never deletes a row the user cannot see, and the
  count in the contextual bar is the count of checks on screen.
- **The lock is the states that exist.** The owner's suggestion, blocking the search during a delete, needs no
  new state: `Selecting` and `Deleting` already are states only their own messages leave, and the search's
  messages are rejected in them. `Deleting` is left only by its completion (**verified**, the comment on
  `Selection`), so the lock lasts exactly as long as the deletion, with no id to match the answer to.
- **A keystroke on the frame of a long press.** A key typed between a long press that selects and the frame that
  replaces the bar reaches `update` as `QueryChanged` while `Selecting`, and is rejected: the field then shows,
  for that frame, a character the state does not have. The next frame removes the field; when the selection ends
  the field is created anew from the state's query. The one case where the Guide's rule and the lock disagree,
  bounded to a frame and resolved by the input's own re-creation.
- **The storage changing while filtering.** `ListChanged` replaces the items, and the filter applies to the new
  ones in `makeModel`: a product added on another page shows on return if it matches; one deleted leaves; the
  selection is pruned as said. A change can also reach the page in more messages than one before a frame
  (**verified**, the comment in `ListChanged`): the arrivals and departures logic is untouched, and the filter
  adds no state to it.
- **An undo after the query changed.** `Deleted` ends the lock; the user may type before tapping "Undo", so the
  restored products may not match: they are back in the storage, hidden by the filter. The snackbar is
  honest ("Product deleted" was undone: it is back), the storage is the truth, and closing the search shows it.
  Locking the search while the snackbar stands (five seconds) was judged worse than this edge.
- **Hidden pages.** `Products`' subscriptions, the back button's included, run only while Home is on top
  (**verified**: `page('Home').subscribed` in the root), so the search's back button never steals a press from
  the page over Home. The storage's change caused by an edit or an add reaches Home when it is back on top.

## Motion, and what to check

- **The bar and the list** transition their height and padding together (`short-4`, standard curve: a simple
  change of size, as the `views` skill has it), on the main thread, once per open and close. The field's row
  may fade in with `delayed`, as the menu does; the headline block leaves instantly (it is not drawn). To check:
  that the two transitions start on the same frame and the rows do not jump.
- **Rows on a keystroke** come and go with no transition: snabbdom removes and inserts the `li`s, keyed by id,
  and `Listed` rows have no `remove` style (**verified** in `rowMotion`). A row `Arriving` or `Leaving` that
  the filter hides is not drawn; should the query change within the settling window (500ms) so that it shows,
  it plays what is left of its entrance or exit from where the CSS is, which is right for an arriving row and a
  short closing for a leaving one. Rare and harmless; noted so that it is not taken for a bug.
- **The list and the no-matches state replace each other** with the `leaving` style (**verified**: `remove`
  fades the removed content, out of the flow, over what takes its place). Typing past the last match and back
  within 200ms stacks a fading list under a new one. To check in the browser with fast typing: if it flickers,
  the no-matches state gets no `remove` style and the list none while the search is open, so that the two swap
  instantly, keeping the fades for the storage's changes only.
- **The move of a row after an edit** is a jump today and stays one; a row that stops matching after a rename
  disappears the same way (it is not a departure: its id still exists). A FLIP of the rows is in
  `edit-product.md`'s "Later", and would cover both.
- **The keyboard.** The manifest sets no `windowSoftInputMode` (**verified**: none in
  `android/app/src/main/AndroidManifest.xml`), and the keyboard shrinks the viewport
  (**verified** in the emulator on 2026-10-28, on the pages that add and edit a product: `innerHeight` 914 to
  578 on a Pixel 6), lifting the fixed add button and the snackbar's slot above it; Android's back button, with
  the keyboard open, closes the keyboard first and reaches the app on the second press (**verified** there too).
  Still to be seen: that a query that clamps the scroll to the top fires `scroll`,
  so that `isAtTop` is true when the search closes and the bar grows back; and that the keyboard's search key
  leaves the keyboard up, which the owner may want otherwise (see "Open points").
- **Reduced motion:** the height and padding transitions are the app's standard ones and follow the existing
  media query; nothing new is animated.

## Open points, and what was decided

- **Where the query lives.** In Home, the bar's owner, or in `Products`, the list's. In Home, every keystroke
  would go down to `Products` as an `ExternalMessage`, which would keep the query too, to filter: the same state
  in two programs, which the `add-program` skill names as the mark of a wrong boundary; and Home would have to
  read the child's selection to hide the field, which a parent never does. **Decided: `Products`**, which gives
  Home the pieces, as it does for the selection. The cost is a child of a page observing the back button, which
  `AGENTS.md` words as a page's: the rule is really "the program that has something to close", and `AGENTS.md`
  is amended with the change ("Documentation", below).
- **Live filtering against a search request.** A `ProductList` that took the query (`WHERE name LIKE`) would
  restart its subscription on every keystroke (the key would hold the query), reload the list each time, lose the
  arrivals and departures across keystrokes, match case-insensitively for ASCII only and know nothing of
  accents. In memory, the filter is pure, instant, and the whole concurrency of a request (an answer older than
  the query, a delete between a request and its answer) does not exist. **Decided: in memory**, as decision 1.
- **What the selection does to the search.** (a) Let the query change while selecting and deselect what the
  filter hides: typing would silently change what "Delete" deletes. (b) Keep hidden rows selected: "Delete"
  would delete rows the user cannot see. (c) Lock the query while a selection exists, which Material's
  contextual action bar does by replacing the bar. **Decided: (c)**, the simplest and the safest, as decision 3.
- **The subtitle in search mode.** The small bar has no second line. Keeping the medium height for a count
  would hold 60dp of a 640dp screen with the keyboard up for a number the list already shows. **Decided: no
  subtitle in the search bar**; the contextual bar, which has the line, says "2 of 7 items" while a filter is
  on, and the no-matches state says the rest.
- **The keyboard's search key.** The list is live, so the key has nothing to submit. Users may expect it to
  dismiss the keyboard, which is a DOM effect (`blur`) the view may not run. Options, should the owner want it:
  `enterKeyHint: 'done'`, if the WebView's IME hides itself on "done" (to verify in the emulator); or a handler
  of `tea-snabbdom`, beside `onPreventingDefault`, that blurs the input on Enter, a detail of the DOM the view
  hides as it hides `preventDefault`. **Decided: `search`, and nothing on Enter**, until seen on the device.
- **Matching: prefix of a word or substring.** A prefix match ("lat" finds "Latte", "tte" does not) is what
  search views usually do; a substring match is more forgiving in a list of a few dozen names where the user
  may remember the middle of one ("parm" for "Grana parmigiano"). **Decided: substring**, every word of the
  query anywhere in the name.
- **Chips for the expiration.** "Expired", "Expiring this week", "Never expires" are a second criterion with
  the same shape (a filter on the rows shown, locked by the selection) and the same questions (what the empty
  state says, what the count counts). Left out to keep this change to the text; the state is shaped so that a
  second criterion joins the query in `Search.Open`, and the rows shown are those that pass both.
- **The focus when the search bar comes back.** After a selection, the field is a new element, and
  `focusOnInsert` focuses every input it is given: the keyboard comes back with the bar. Avoiding it needs the
  state to say whether the field is to be focused (`Open.focus`, set by `SearchOpened` and `QueryCleared`, cleared
  by `ItemSelected`), a flag for one frame's hook. **Decided: focused again**, the search being what the user was
  doing; the flag if the owner finds the keyboard's return in the way.
- **Searching while the storage is empty or unreadable.** The icon is withheld: there is nothing to search. A
  search already open stays open when the storage empties under it, and shows the storage's empty state.

## Tests

- `src/libs/strings/text-search.test.ts`, the properties in "The matching rule", with an arbitrary of queries
  in `text-search.test_arbitrary.ts`.
- `products/program.test_arbitrary.ts`: `search` (`Closed`, `Open` with any string and any key), in `state`; the
  new messages in `message`; `shown` helpers for the tests. The coverage test lists the new variants.
- `products/program.test.ts`: one test per new message, as the existing ones (`SearchOpened` opens only while
  closed, loaded with items and idle; `QueryChanged` stores any text while open and idle, and is rejected
  otherwise; `QueryCleared` empties and bumps the key only while there is text; `SearchClosed` and `BackPressed`
  close while open and idle, `BackPressed` a defect otherwise); `ItemSelected` and `EditRequested` rejected on
  an id hidden by the filter; `ListChanged` keeps exactly the selected ids still shown; the model: the rows
  shown are exactly the rows of the whole order whose name matches, in order, the leaving ones included;
  `NoMatches` exactly when a filter is on and no item matches; `maybeMatching` counts the items shown while a
  filter is on; `search` is `Covered` exactly while a selection exists and the search is open, `maybeOpen` exactly
  when the list has items and nothing is selected; the subscriptions test gains the back button's key. The
  invariant "every selected id is shown" as a property over `applyAll` of arbitrary message sequences from any
  valid state.
- `home/program.test.ts`: the view test's `askable` gains the search's messages, `withheld` the cases above;
  the "reaches messages that update can reject" test lists them.
- `src/app/user.test_support.ts`: `openSearch`, `typeQuery(text)`, `clearQuery`, `closeSearch`, and a scenario in
  the root's tests: search, select a match, delete, undo, close, over the database in memory.

## Documentation

With the change: `AGENTS.md`, the back button's rule ("The back button is each program's, only while it has
something to do with it: a page, or a child of one, such as Home's list while its search is open"); `README.md`,
the status paragraph (searching the list); `src/README.md`, `libs/` (the text search) and Products' folder
(the query); the `views` skill, where it lists the pieces `Products` gives Home (the search button and the
search bar). This document is then pruned to what was built.

## Later, not in this change

- Filter chips on the expiration, as a second criterion of the same search.
- The back button clearing the selection, as Material's contextual action bar does, which today is left to the
  platform (the press leaves the app); with the search, the two would be closed in order, the selection first.
- A FLIP of the rows, for a row that moves or stops matching after an edit.
- Highlighting the matched text in a row's headline.
- The keyboard's search key dismissing the keyboard, if the device does not.
