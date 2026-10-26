---
name: add-program
description: How to add a program to Fridgy's tree of Elm-style programs in src/app (a page of the root, or a child of a page), with its view, layer, services and property tests, and how a parent declares it. Use when creating a page, splitting a program into children, or changing how a parent declares, starts or draws a child.
---

# Add a program

Read `node_modules/@fgaudo/effect-tea/README.md` ("Guide" and "Testing") first: its rules are this app's. The
programs to copy are `src/app/children/about` (a page in one module) and `src/app/children/home` (a page with a
child of its own, declared like the root declares its pages).

## The folder

Every program is a folder of the same shape, at any depth:

```
<program>/
├─ program.ts               State, Message, Event, Command, Deps, Model, program
├─ view.tsx                 the view (see the `views` skill)
├─ layer.ts                 the adapters of its services, merged with its children's layers
├─ program.test.ts          property tests of update, the view and the subscriptions
├─ program.test_arbitrary.ts  generators of its states and messages, valid values only
├─ services/<service>/      what it needs from outside (see the `add-service` skill)
└─ children/<child>/        its own children, of this same shape
```

Never split a program into `messages`/`state`/`update` files: they would import each other in cycles. A
program splits only when it is too large (300–400 lines), into children by concern, never by kind: what spans
the children (the menu, the back button) stays in the parent; what concerns one child, even how the user
learns of its failure, stays in the child. Children that read each other's state are one child.

## `program.ts`

- `State` is one explicit state machine per concern (data, selection, form): a union with a case per state,
  no shared flags, no derived data. A value that depends on time is computed in `makeModel` from a `now` a
  clock subscription keeps in the state.
- Messages are a `Data.TaggedEnum`. Export `Message`, `Event` and `Command` as types only (a parent takes
  them with `Tea.MessageOf` and `Tea.CommandOf`); export `ExternalMessage`, when the parent may give the
  program one, as a value. Tests build their own constructors with `Data.taggedEnum<Message>()`.
- `services: Deps` lists the program's services, its children's included (`Viewport | BackButton | Products.Deps`).
- `update` returns `Tea.reject` for a message that does not apply in this state but may still arrive (a tap
  on a frame the state has moved past). A message the invariants rule out, such as an operation's completion
  outside the state that only it leaves, or a subscription's message outside the states that list its key,
  ends the run with `defect(reason)` (`#libs/defect/defect.ts`).
- `Model` is what the view distinguishes: a union with a case per state, each holding only the messages of
  its controls (`open: Message`, `changeName: (name: string) => Message`), picked from the state as `update`
  reads it, never by calling `update`. The view sends only what the model holds.
- Commands turn expected failures into messages with `Effect.match({ onSuccess, onFailure })` followed by
  `Effect.asSome`, as the last steps of their `Effect.fn`, and carry `Effect.withLogSpan`.
  Subscriptions map a service's `Source<A, never>` into messages (`Channel.unwrap` to read the service,
  `Channel.map`); a process that ends turns its `Done` into a message. The back button is the subscription
  keyed `back-button`, observed only while the page has something to do with a press.
- Effects only in commands and subscriptions: `update`, `makeModel` and the view are pure.

## Declaring a child

A parent declares a child; the library routes its messages (`{ _tag: '<Child>', message }`), commands,
subscriptions and models.

```ts
const { child, compose } = Tea.parent<{ state: State; command?: Command; event?: Event }>()

export const program = compose({
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
  update: (message: Own) => (state) => ...,
  makeModel: (state, children) => ({ ..., products: children.Products(state) }),
})
```

- A parent decides whether a child is there only with its place: `at`, an optic into its state, or, where no
  optic of Effect finds it (a page by its tag in the root's stack), the two functions `get` (an `Option`) and
  `set`; never by rejecting its messages. A child started in `onEvent` is started the same way, with
  `children.<Child>.init`: reading its program's `init.state` would leave its commands behind.
- A child talks to its parent only through events; a parent never reads a child's state to decide. What a
  child needs, it gets from its own services and subscriptions. Only a fact several children must see as one
  truth (the viewport, the connection) is the parent's, handed down as an `ExternalMessage` with
  `children.<Child>.update`. Two siblings talk through the parent: an event up, an `ExternalMessage` or an
  `init` parameter down; a parent that grows logic there is a sign that the siblings are one child.
- The view gives each child's view `Tea.dispatchTo(dispatch, '<Child>')`, the same function in every frame,
  and hands it the child's model whole: it never reads a child model's fields. A child's model is the same
  object while its state is, so a view that rarely changes is drawn with snabbdom's `thunk`.

## `layer.ts`

`Layer.mergeAll` of the children's layers and of every adapter of the program's own services that has no
alternative. An adapter with alternatives (the `SqlClient`, the platform's `BackButton`) stays out, and each
entrypoint in `src/entrypoints/` imports the one it picks (see the `add-service` skill).

## Tests

`program.test_arbitrary.ts` exports `state` (and `message`) generators that produce only valid values, built
from the domain's `*.test_arbitrary.ts` files, never from `*Unsafe` constructors. `program.test.ts` checks, with
`assertProperty` and `outcomesOf` (`#libs/testing/update.test_support.ts`):

- `update` is total and deterministic;
- the view sends what `update` accepts, all of it, and acts once when sent twice: `dispatchViolations` on the
  messages `messagesSentBy(view, makeModel(state))` sends, with the candidates the test lists, `repeatable`
  for what may act on every tap, `withheld` for what the view hides on purpose;
- one test per message, asserting the next state, the commands and the events by value, rejections with
  `Tea.isRejected`, never as "state unchanged"; a message that cannot arrive is checked as a defect, and the
  pairs of state and message it rules out are skipped;
- what the program listens to in each state, from `Tea.subscriptionsOf(program)` (`HashMap.has(…, 'back-button')`);
- the arbitraries cover every variant of the state.

A child whose view only draws pieces the parent places (Products) has its `update` tested in its own
`program.test.ts`, and its pieces checked by its parent's view test.

## A page of the root

Declare it in `src/app/program.ts` (`children`, `subscribed: shownPageState('<Page>')`, its events in
`onEvent`, its model in `makeModel`), merge its layer in `src/app/layer.ts`, and add how a user reaches it to
`src/app/user.test_support.ts`, where the root's tests pick each message from the shown page's model
(`rehearse`). The root knows nothing of the back button: a page observes it while it has something to close,
or always, when a press asks the parent to leave it.

## Moving files

Update the paths in `scripts/cli.ts` and `package.json`, and the folders named in `README.md`,
`src/README.md` and `AGENTS.md`.
