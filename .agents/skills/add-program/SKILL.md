---
name: add-program
description: How to add a program to Fridgy's tree of Elm-style programs in src/app (a page of the root, or a child of a page), with its view, layer, services and property tests, and how a parent declares it. Use when creating a page, splitting a program into children, or changing how a parent declares, starts or draws a child.
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
├─ view.tsx                 the view (see the `views` skill)
├─ layer.ts                 the adapters of its services, merged with its children's layers
├─ program.test.ts          property tests of update, the view and the subscriptions
├─ program.test_arbitrary.ts  generators of its states and messages, valid values only
├─ services/<service>/      what it needs from outside (see the `add-service` skill)
├─ children/<child>/        its own children, of this same shape
└─ programs/<program>/      a program two programs of this subtree use, of this same shape (see "A program
                            two programs use")
```

Never split a program into `messages`/`state`/`update` files: they would import each other in cycles. A
program splits only when it is too large (300–400 lines), into children by concern, never by kind: what spans
the children (the menu, the back button) stays in the parent; what concerns one child, even how the user
learns of its failure, stays in the child. Children that read each other's state are one child, and the size
yields to that: a candidate child whose controls the parent would have to enable from its state, or whose state
the parent would have to copy down and back up, is not one. `add-products` is the example, and stays one
program past 800 lines: its second step needs the name and the clock, and its "Add" and the first step's
acknowledgement share one submission; even the scanner's dialog would cost a second
service and a module of the infrastructure to move its sixty lines.

## `program.ts`

- `State` is one explicit state machine per concern (data, selection, form): a union with a case per state,
  no shared flags, no derived data. A value that depends on time is computed in `makeModel` from a `now` a
  clock subscription keeps in the state.
- The program names its types, then is made: `const { input, child, make } = Tea.program<{ state: State;
  message: Own; command: Command; event: Event }>()`, then `export const program = make({ … })`. `message` names
  the program's own messages only: `make` adds its children's and the writes into its inputs, and the program
  exports all of them as `type Message = Tea.MessageOf<typeof program>`. Its services are inferred.
- Messages are a `Data.TaggedEnum`. Export `Message`, `Event` and `Command` as types only (a parent takes
  them with `Tea.MessageOf` and `Tea.CommandOf`). The messages a parent may send are named `external`, and the
  program answers them in `external`, apart from `update`, in every state. Tests build their own constructors
  with `Data.taggedEnum<Message>()`.
- `update` returns `Tea.reject` for a message that does not apply in this state but may still arrive (a tap
  on a frame the state has moved past). A message the invariants rule out, such as an operation's completion
  outside the state that only it leaves, or a subscription's message outside the states that list its key,
  ends the run with `Tea.defect(reason)`, which throws an `InvariantDefect`. Only the state and the run rule a
  message out: a message of the view, or an event raised for one, is never a defect, whatever the view draws.
- `Model` is what the view distinguishes: a union with a case per state, each holding only the messages of
  its controls (`open: Message`), picked from the state as `update` reads it, never by calling `update`. The
  view sends only what the model holds. A model is data and holds no function: a message for each value of a
  small set is held for each value (a keypad's digits), and a value the view gives is written into an input.
- An input (`inputs: { Name: input({ at }) }`) is a place of the state that the view writes into, through
  `Tea.forwardTo(dispatch, 'Name')`: the text of a field, and a value of the platform that only an element's event
  gives (a layout's height, a scroll's offset). No `update` sees a write. An input whose `set` keeps less than
  what is written (Home's scroll, of which it keeps how far the top app bar collapses) returns the very same
  state while what it keeps does not change, and its `get` gives a value that `set` would keep as it is.
- Commands turn expected failures into messages with `Effect.match({ onSuccess, onFailure })` followed by
  `Effect.asSome`, as the last steps of their `Effect.fn`, and carry `Effect.withLogSpan`.
  Subscriptions map a service's `Source<A, never>` into messages (`Channel.unwrap` to read the service,
  `Channel.map`); a process that ends turns its `Done` into a message. The back button is the subscription
  keyed `back-button`, observed only while the program has something to do with a press: a page, or the child that holds what a press closes (Home's `Products`, its selection).
- Effects only in commands and subscriptions: `update`, `makeModel` and the view are pure.

## Declaring a child

A parent declares a child; the library routes its messages (`{ _tag: '<Child>', message }`), commands,
subscriptions and models.

```ts
const { child, make } = Tea.program<{ state: State; message: Own; event: Event }>()

export const program = make({
  init: (children) => {
    const products = children.Products.init // started here, and its commands go out with the parent's
    return { state: { ..., products: products.state }, commands: products.commands }
  },
  children: {
    Products: child(Products.program, {
      // Where it lives: `.compose(Optic.some())` for a child that may not be there.
      at: Optic.id<State>().key('products'),
      subscribed: (state) => ..., // optional: when its subscriptions run (a page, only while on top)
    }),
  },
  onEvent: { Products: (event, children) => (state) => ... }, // the child's events, handled here
  update: (message, children) => (state) => ...,
  makeModel: (state, children) => ({ ..., products: children.Products(state) }),
})
```

- A parent decides whether a child is there only with its place: `at`, an optic into its state, or, where no
  optic of Effect finds it (a page by its tag in the root's stack), the two functions `get` (an `Option`) and
  `set`; never by rejecting its messages. A child started in `onEvent` is started the same way, with
  `children.<Child>.init`: reading its program's `init.state` would leave its commands behind.
- A child talks to its parent only through events; a parent never reads a child's state to decide. What a
  child needs, it gets from its own services and subscriptions. Only a fact several children must see as one
  truth (the viewport, the connection) is the parent's, handed down as an external message with
  `children.<Child>.external`. Two siblings talk through the parent: an event up, an external message or the
  child's flags down; a parent that grows logic there is a sign that the siblings are one child.
- An event the parent only passes up, it raises as its own:
  `onEvent: { Products: (event) => (state) => ({ state, events: [event] }) }`. A parent's own step followed by a
  child's is `Tea.andThen(step, children.<Child>.external(…))`, which keeps the commands and the events of both.
- The view gives each child's view `Tea.forwardTo(dispatch, '<Child>')`, the same function in every draw,
  and hands it the child's model whole: it never reads a child model's fields. A child's model is the same
  object while its state is.

## `layer.ts`

`Layer.mergeAll` of the children's layers and of every adapter of the program's own services that has no
alternative. An adapter with alternatives (the `SqlClient`, the platform's `BackButton`) stays out, and each
entrypoint in `src/entrypoints/` imports the one it picks (see the `add-service` skill).

## Tests

`program.test_arbitrary.ts` exports `state` (and `message`) generators that produce only valid values, built
from the domain's `*.test_arbitrary.ts` files, never from `*Unsafe` constructors. `program.test.ts` checks, with
`assertProperty` and `outcomesOf` (`#libs/testing/update.test_support.ts`):

- `update` is total and deterministic;
- the view sends what `update` accepts, all of it, and acts once when sent twice:
  `dispatchViolations(program.update, { state, held, candidates, repeatable, withheld })`, `held` being the
  messages `messagesSentBy(view, makeModel(state))` sends, the writes into inputs among them, `candidates` what the
  test lists, `repeatable` what may act on every tap, `withheld` what the view hides on purpose;
- one test per message, asserting the next state, the commands and the events by value, rejections as
  `Tea.reject` itself, never as "state unchanged"; a message that cannot arrive is checked as a defect
  (`toThrow(Tea.InvariantDefect)`), and the pairs of state and message it rules out are skipped;
- what the program listens to in each state, from `program.subscriptions(state)` (`HashMap.has(…, 'back-button')`);
- the arbitraries cover every variant of the state.

A child whose view only draws pieces the parent places (Products) has its `update` tested in its own
`program.test.ts`, and its pieces checked by its parent's view test.

## A program two programs use

What two programs have in common moves up when its truth lies outside them (a rule, to `src/libs/` or
`src/domain/`; a look of Material's, to `src/styles.ts`), and is written twice where they may legitimately
differ (a line of layout, the composition of a page): never a module of model fragments or view pieces
generic in the caller's message. When what they share is a whole program, a state machine with its view, it
moves up as it is: into `programs/<program>/` of their lowest common parent, of the shape above, and each of
them declares it as a child, through its three modules, as in "Declaring a child". It belongs to no parent:
it knows nothing of who contains it, and a change made for one user that the other cannot take is a sign
that they share less than a program. Two uses are few: copy first (`docs/edit-product.md`, the date entry),
and move up when the copies start to cost. There is none yet; `biome.json` already lets a child of the
parent import `../../programs/<program>/`, and any program `#app/programs/<program>/` (the root's), the modules
at the program's root only, as for a child, its arbitraries from tests included. A deeper parent's `programs/`
from a grandchild of it needs an alias past `../../`, and the override on that parent's folder that confines
it to the subtree: written with the first such program.

## A page of the root

Declare it in `src/app/program.ts` (`children`, `page('<Page>')` for where it lives and when it listens, its
events in `onEvent`, its model in `makeModel`), merge its layer in `src/app/layer.ts`, and add how a user reaches
it to `src/app/user.test_support.ts`, where the root's tests pick each message from the shown page's model
(`rehearse`). A page that cannot start the same way every time declares `flags` (`EditProduct`: the product
tapped, and its id) and is started from them in `onEvent`, `show(state, '<Page>', children.<Page>.init(flags))`;
what it starts from comes in the event that asks for it, never from another program's state. The root knows nothing of the back button: a page, or its child, observes it while it has something to close,
or always, when a press asks the parent to leave it.

## Moving files

Update the paths in `scripts/cli.ts` and `package.json`, and the folders named in `README.md`,
`src/README.md` and `AGENTS.md`.
