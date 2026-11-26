---
name: add-program
description: How to add a program to Fridgy's tree of Elm-style programs in src/app (a page of the root, or a child of a page), with its view and property tests, and how a parent declares it. Use when creating a page, splitting a program into children, or changing how a parent declares, starts or draws a child.
---

# Add a program

Read the runtime's guide first, which the package holds: `node_modules/@fgaudo/effect-tea/skills/effect-tea/SKILL.md`
says which of its pages to read for what, and its rules are this app's. The programs to copy are `src/app/children/about` (a page in one module) and `src/app/children/home` (a page with a
child of its own, declared like the root declares its pages).

## The folder

Every program is a folder of the same shape, at any depth:

```
<program>/
├─ program.ts               State, Message, Event, Command, Model, program
├─ <concern>.ts             once the program is split: a concern's messages, update and model (see "Splitting")
├─ view.tsx                 the view (see the `views` skill); none where the parent draws the model (the snackbar)
├─ program.test.ts          property tests of update, the view and the subscriptions
├─ program.test_arbitrary.ts  generators of its states and messages, valid values only
├─ children/<child>/        its own children, of this same shape
└─ programs/<program>/      a program two programs of this subtree use, of this same shape (see "A program
                            two programs use")
```

A program splits only when it is too large (300–400 lines), by concern, never by kind: never into
`messages`/`state`/`update` files, which spread each concern over three. What spans the children (the menu, the
back button, the page's one snackbar) stays in the parent; what concerns one child stays in the child. Parts
that read each other's state are one program, and the size yields to that: a candidate child whose
controls the parent would have to enable from its state, or whose state the parent would have to copy down and
back up, is not one. A part with a state of its own, which the parent reads only as a value the part declares,
is a child, and that value its `output`. `add-products` is the example: its name, scanner, lookup and
submission read one another and stay one program, however long, while the date (`programs/expiration`, whose
`output` the submission makes a product of) and the fridge (`children/fridge`, told each product added) are
children.

### Splitting

Such a program is split into modules of its own folder, one per concern, as the guide's "Splitting a program"
says. `add-products` (`name.ts`, with the lookup that replaces the name; `scanner.ts`; `submission.ts`) and
`home/children/products` (`list.ts`, `selection.ts`, `clock.ts`) are the examples.

- `program.ts` keeps the types the program is made from (`State`, `Command`, `Event`, `Model`, what it tells
  its children and reads of them, the type of a step), its declaration, and an `update` whose `switch` gives each
  message to the one concern that owns it. A concern too small to pay for a module stays in it: the page's own
  messages of `add-products` (closing, the back button, the keyboard, the clock).
- A concern's module holds its messages, its state's types, the effects of its commands, its subscriptions and
  the keys that list them, its `update`, typed with the program's `Command`, and the parts of the model it makes,
  all functions of the whole state. It makes the program's commands and events with
  `Data.taggedEnum<Command>()` of the type `program.ts` exports. It exports what the other concerns read
  (`Scanner.canScan`), and what it asks of another is that one's function returning a step, combined with
  `Tea.andThen` (`Name.lookingUp`, `Selection.listChanged`).
- A concern imports `program.ts` with `import type` alone, and the concerns import each other's values one way
  only (`products`: the list asks the selection and the clock; `add-products`: the scanner asks the name). A
  cycle of values leaves a module's exports undefined while the other loads. Where two concerns would write each
  other, they are one (the name and the lookup); a concern that only reads another's field reads it from the
  state.
- The modules are private to the folder: Biome lets a parent import only `program.ts` and `view.tsx`. The
  view, the tests and the arbitraries import each type from the module that declares it.

## `program.ts`

- `State` is one explicit state machine per concern (data, selection, form): a union with a case per state,
  no shared flags, no derived data. A value that depends on time is computed in `makeModel` from a `now` a
  clock subscription keeps in the state.
- The program names its types, then is made: `const { make } = Tea.program<{ state: State; model: Model;
  message: Own; command: Command; event: Event; key: Key }>()`, then `export const program = make({ … })`, or
  `withChildren({ … }).make({ … })` for a parent. `message` names the program's own messages only:
  `withChildren` adds its children's, and the program exports all of them as
  `type Message = Tea.MessageOf<typeof program>`. Its services are inferred.
- Messages are a `Data.TaggedEnum`. Export `Message`, `Event` and `Command` as types only (a parent takes
  them with `Tea.MessageOf` and `Tea.CommandOf`). The messages a parent may send are named `external`, and the
  program answers them in `external`, apart from `update`, in every state. What it gives its parent to read is
  named `output`. Tests build their own constructors with `Data.taggedEnum<Message>()`.
- `update` returns `Tea.reject` for a message that does not apply in this state but may still arrive (a tap
  on a frame the state has moved past). A message the invariants rule out, such as an operation's completion
  outside the state that only it leaves, or a subscription's message outside the states that list its key,
  ends the run with `Tea.defect(reason)`, which throws an `InvariantDefect`. Only the state and the run rule a
  message out: a message of the view, or an event raised for one, is never a defect, whatever the view draws.
- `Model` is what the view distinguishes: a union with a case per state, each holding only the messages of
  its controls (`open: Message`), picked from the state as `update` reads it, never by calling `update`. The
  view sends only what the model holds. A model is data and holds no function: a message for each value of a
  small set is held for each value (a keypad's digits).
- What an element holds or reports (the text of a field, a layout's height, a scroll's offset) is a message
  with its value (`NameTyped { value }`, `Scrolled { offset }`), which the model holds without it
  (`nameTyped: { _tag: 'NameTyped' }`) wherever the view draws the element, and the view fills
  (`dispatch({ ...model.nameTyped, value })`). `update` never rejects it by its value: one that changes nothing
  keeps the very same state (Home's `Scrolled`, of which it keeps how far the top app bar collapses). An
  element that reports at each of its events sends one message where the program only needs the end: the end
  of a scroll is `ScrollEnded { offset }`, with where the list rests.
- Commands turn expected failures into messages with `Effect.match({ onSuccess, onFailure })` followed by
  `Effect.asSome`, as the last steps of their `Effect.fn`, and carry `Effect.withLogSpan`.
- A subscription is made from its key alone: `key` names the keys among the types, `subscriptions: (state) =>
  [keys]` lists those that run, and `listen: (key) => subscription` makes each, so a key carries what its
  subscription needs (the snackbar's `Standing { id, until }`). Subscriptions map a service's `Source<A, never>`
  into messages (`Channel.unwrap` to read the service, `Channel.map`); a process that ends turns its `Done` into
  a message. A service that every program uses the same way writes that use once, beside it: the subscriptions
  `pressesAs` (`back-button.ts`) and `insetsAs` (`keyboard.ts`), the commands `vibrate` (`haptics.ts`) and
  `openLink` (`links.ts`). The back button is the subscription keyed `back-button`, observed only while the program has
  something to do with a press: a page, or the child that holds what a press closes (Home's `Products`, its
  selection).
- Effects only in commands and subscriptions: `update`, `makeModel` and the view are pure.

## Declaring a child

A parent declares its children with `withChildren`, and the library keeps them: it starts and drops each, and
routes its messages (`{ _tag: '<Child>', message }`), commands, subscriptions and models. `Home` declares one
child; the root declares Home and its pages by id; `add-products` declares a child told from its state.

```ts
const { child, withChildren } = Tea.program<{ state: State; model: Model; message: Own; event: Event }>()

export const program = withChildren({
  Products: child(Products.program), // always there
  Expiration: child(Expiration.program, {
    flags: (state) => showsDate(state) ? Opt.some(newDate) : Opt.none(), // there while `Some`, started from it
    tell: (state) => ({ _tag: 'PageChanged', … }), // what it was last told, from the parent's state
  }),
}).make({
  init: { state: { … } }, // the parent's own state alone: the library starts the children
  onEvent: { Products: (event) => (state) => ({ state, events: [event] }) }, // the child's events, handled here
  update: (message, children) => (state) => …, // `children.Expiration.output()`: what the child concludes
  makeModel: (state, children) => ({ …, products: children.Products() }),
})
```

- A parent's functions get its own state alone. Whether a child is there is said by its declaration, from that
  state: always, `there`, `flags` (other flags start it again) or `key` (another value starts it again) for a
  child alone, `ids` or `flags` by id for children by id (`childById`, the root's pages); never by rejecting its
  messages. `listening` says when its subscriptions run (Home's, only while it is shown).
- Each start of a child is an instance: an answer for an instance that is gone is rejected by the library. A
  message of a view names no instance, so where a tap of an old one must not reach a new one, ids are never
  used again (the root's visits).
- A child talks to its parent through events, and the parent reads what holds in it through its `output`
  (`children.<Child>.output()`, an `Option` for a child that may not be there), never a copy of it. What a child
  needs, it gets from its flags, its own commands and subscriptions. A fact of the parent's state that a child
  must see is told by the declaration's `tell` (the date's `PageChanged`: the time, and whether the form is
  locked); a step tells a child something once with `tell: [{ _tag: '<Child>', message }]`. Two siblings talk
  through the parent: an event up, an external message or the child's flags down; a parent that grows logic
  there is a sign that the siblings are one child.
- An event the parent only passes up, it raises as its own:
  `onEvent: { Products: (event) => (state) => ({ state, events: [event] }) }`. Steps are combined with
  `Tea.andThen`, which keeps the commands, the events and what each tells.
- The view gives each child's view `Tea.forwardTo(dispatch, '<Child>')` (with its id for a child by id), the
  same function in every draw, and hands it the child's model whole: it never reads a child model's fields,
  except the model of a child without a view (the snackbar), which the parent's view draws. A child's model is
  the same object while its state is.

## What it needs from outside

A program lists the infrastructure's services as they are, in its commands and subscriptions (see the
`add-service` skill); it holds no service, adapter or layer of its own. `src/app/layer.ts`, the only layer of
`src/app/`, provides the stores; the entrypoint and `src/app/user.test_support.ts` each provide the rest, and a
service a program starts to use that one of them lacks fails the typecheck.

## Tests

`program.test_arbitrary.ts` exports `state` (and `message`) generators that produce only valid values, built
from the domain's `*.test_arbitrary.ts` files, never from `*Unsafe` constructors. A parent's whole state is made
with `stateOf(program, own, states)`, from its own state and its children's arbitraries
(`home/program.test_arbitrary.ts`). `program.test.ts` checks, with `assertProperty` and `outcomesOf`
(`#libs/testing/update.test_support.ts`):

- `update` is total and deterministic;
- the view sends what `update` accepts, all of it, and acts once when sent twice:
  `dispatchViolations(program.update, { state, held, candidates, repeatable, inert, withheld })`, `held` being
  the messages `messagesSentBy(view, makeModel(state))` sends, those the view fills among them, `candidates`
  what the test lists, `repeatable` what may act on every tap, `inert` what the model holds and does nothing in
  that state (a report that changes nothing), `withheld` what the view hides on purpose;
- a message the view fills is accepted whatever its value, with values fast-check draws;
- one test per message, asserting the next state, the commands, the events and what the step tells by value,
  rejections as `Tea.reject` itself, never as "state unchanged"; a message that cannot arrive is checked as a
  defect (`toThrow(Tea.InvariantDefect)`), and the pairs of state and message it rules out are skipped;
- what the program listens to in each state, from the keys `program.subscriptions(state)` lists, its children's
  among them as `{ _tag: '<Child>', instance, key }`;
- the arbitraries cover every variant of the state.

A child whose view only draws pieces the parent places (Products) has its `update` tested in its own
`program.test.ts`, and its pieces checked by its parent's view test.

## A program two programs use

What two programs have in common moves up when its truth lies outside them (a rule, to `src/libs/` or
`src/domain/`; a look of Material's, to `src/styles.ts`), and is written twice where they may legitimately
differ (a line of layout, the composition of a page): never a module of model fragments or view pieces
generic in the caller's message. When what they share is a whole program, a state machine with its view where
it has one, it moves up as it is: into `programs/<program>/` of their lowest common parent, of the shape above,
and each of them declares it as a child, through the modules at its root, as in "Declaring a child". It belongs
to no parent: it knows nothing of who contains it, and a change made for one user that the other cannot take is
a sign that they share less than a program. The root's are `snackbar` (generic in its notice, `make<Notice>()`,
a child of `Products`, `AddProducts` and `EditProduct`) and `expiration` (the date typed on the keypad, with its
view and the setting of its order, a child of `AddProducts` and `EditProduct`). `biome.json` lets a child of the
parent import `../../programs/<program>/`, and any program `#app/programs/<program>/` (the root's), the modules
at the program's root only, as for a child, its arbitraries from tests included. A deeper parent's `programs/`
from a grandchild of it needs an alias past `../../`, and the override on that parent's folder that confines
it to the subtree: written with the first such program.

## A page of the root

Declare it in `src/app/program.ts` as a child by the number of its visit (`childById`, with `ids` or, for a page
with flags, `flags`, from `visitsOf` and the root's `maybeVisit`), a case of `Page`, its event in `onEvent`
(`leave`), its model in `makeModel` and its view, keyed by its visit, in `src/app/view.tsx`, and add how a user reaches it to `src/app/user.test_support.ts`, where the root's tests pick
each message from the shown page's model (`rehearse`). A page is shown from Home's event, as `show(state, page)`,
which starts a new visit. A page that cannot start the same way every time declares `flags` (`EditProduct`: the
product tapped, and its id), carried by its case of `Page`; what it starts from comes in the event that asks for
it, never from another program's state. The root knows nothing of the back button: a page, or its child,
observes it while it has something to close, or always, when a press asks the parent to leave it.

## Moving files

Update the paths in `scripts/cli.ts` and `package.json`, and the folders named in `README.md`,
`src/README.md` and `AGENTS.md`.
