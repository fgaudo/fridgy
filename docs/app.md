---
title: 'App layer'
nav_order: 3
---

# App Layer

The app layer is the core of the application. It defines the application's behavior by orchestrating its primary logic.

Its two key components are use cases and operation contracts:

- _Use cases_ represent the core functionalities of the application. Each use case typically depends on one or more operations to fulfill its task.
- _Operations_ are actions such as queries, commands, or resolvers. They're responsible of retrieving or mutating data, but their implementations reside in the data layer. Importantly, the app layer only declares the interfaces for these operations, keeping them decoupled from the actual data access logic.

We utilize the _layers_ system from EffectTs to then compose use cases and their required operations, and to expose them to the UI layer.

## Operations vs Use cases

It’s not uncommon for a use case to initially do nothing more than delegate to a single operation. As a result, the use case may end up being named similarly to the operation it wraps.

At first glance, this might seem like unnecessary duplication. However, as the application evolves, the responsibilities of a use case often expand — such as handling validation, authorization, composing multiple operations, emitting events, or managing side effects. For this reason, it’s important to maintain a clear separation between use cases and operations from the beginning, even when the use case appears trivial.

This separation preserves the flexibility and scalability of the app layer, ensuring that additional logic can be introduced without disrupting the overall architecture or breaking encapsulation.

## Batching Operations

When implementing use cases that require bulk operations — for example, deleting multiple records by their IDs — it's often better to define the operation for a _single entity_, and then use EffectTs’s _Request/Resolver_ mechanism to batch these calls efficiently.

This approach leads to use cases like `DeleteProductsByIds`, which internally call the `DeleteProductById` operation for each ID. Thanks to EffectTs batching, these individual calls can still be executed as a single optimized query under the hood.

Defining operations at the single-entity level provides greater composability and reusability. It allows each operation to remain focused and testable, while use cases retain the flexibility to compose multiple calls and leverage EffectTs for efficient execution — without sacrificing performance or maintainability.

Note: Not every operation is a good candidate for batching. For instance, operations like getAllProducts are inherently bulk-oriented. Batching is only useful when dealing with many independent single-entity operations that can be aggregated efficiently, such as loading or deleting multiple records by ID.

Use cases, on the other hand, should not be implemented as batchable — even when they deal with multiple entities.
A use case represents a higher-level intent or action in the application, and that intent often involves operating on a collection of items as a single cohesive unit.
Splitting such use cases into multiple single-entity use cases would obscure the actual business intent and push responsibility for batching or aggregation to the caller, violating encapsulation.
Instead, the use case should accept the entire input as defined by the business requirement (e.g. a list of IDs) and internally delegate to batchable single-entity operations when appropriate. This approach preserves clarity at the app layer while still leveraging the efficiency of batched execution through the underlying operation layer.

## Design Guidelines

- Use cases should be the exclusive consumers of operations.
- The UI layer should interact only with use cases, never directly with operations.
- Operations should be single-entity oriented if batching them makes sense.
- Use cases should never be batchable. Instead, a batched version should be exposed to the ui.
