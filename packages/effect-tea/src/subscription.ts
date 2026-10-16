import type * as Channel from 'effect/Channel'
import type * as HashMap from 'effect/HashMap'

/**
 * Listens to the world while its key is in the subscriptions: an Effect `Channel` of messages that takes no
 * input, cannot fail, and never ends, as its `never` end value says. It stops when its key goes away.
 */
export type Subscription<Message, R> = Channel.Channel<Message, never, never, unknown, unknown, unknown, R>

export type Subscriptions<K, Message, R> = HashMap.HashMap<K, Subscription<Message, R>>

/** What a program listens to in a state, by key: the engine starts and stops subscriptions as keys come and go. */
export type Subscribe<State, Message, R, K = unknown> = (state: State) => Subscriptions<K, Message, R>
