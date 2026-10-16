import { describe, expect, test } from 'bun:test'
import * as Cause from 'effect/Cause'
import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as Engine from './engine.ts'
import { type Offer, type Offered, offered } from './offer.ts'
import type { Program } from './program.ts'
import { type Frame, run, type RunOptions } from './run.ts'

// A counter that accepts `Increment` and always rejects `Forbidden`; its model offers `Increment`.
type Message = 'Increment' | 'Forbidden'

const update: Engine.Update<number, Message, never> = (message) => (count) =>
  message === 'Increment' ? { state: count + 1 } : Engine.reject

type Model = Readonly<{ count: number; increment: Offer<Message> }>

const counter: Program<number, Model, Message, never> = {
  init: { state: 0 },
  update,
  subscriptions: () => HashMap.empty(),
  makeModel: (count) => ({ count, increment: offered(update, count)('Increment') }),
}

// The engine dies on purpose in some tests: what it logs then is expected.
const quietly = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(Effect.provideService(References.MinimumLogLevel, 'None'))

const runDying = (
  program: Program<number, Model, Message, never>,
  render: (frames: Stream.Stream<Frame<Model, Message>>) => Effect.Effect<void>,
) => run(program, render, { onRejected: 'die' })

describe('run', () => {
  test('frames carry the model, and a dispatch that drives the program', async () => {
    const counts: Array<number> = []
    await Effect.runPromise(quietly(runDying(counter, (frames) =>
      frames.pipe(
        Stream.tap(({ model, dispatch }) =>
          Effect.sync(() => {
            counts.push(model.count)
            if (model.count < 2) dispatch(Opt.getOrThrow(model.increment))
          })
        ),
        Stream.take(3),
        Stream.runDrain,
      ))))
    expect(counts).toEqual([0, 1, 2])
  })

  test('a message the current frame sends and update rejects makes the run fail', async () => {
    const exit = await Effect.runPromiseExit(quietly(runDying(counter, (frames) =>
      frames.pipe(
        Stream.tap(({ dispatch }) =>
          // A buggy view: it forges a message it was not offered.
          Effect.sync(() => dispatch('Forbidden' as Offered<Message>))
        ),
        Stream.runDrain,
      ))))
    expect(Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof Engine.RejectedMessage).toBe(true)
  })

  test('with onRejected: \'ignore\', such a message is dropped, reported, and the program goes on', async () => {
    const counts: Array<number> = []
    const bugs: Array<string> = []
    const exit = await Effect.runPromiseExit(quietly(run(
      counter,
      (frames) =>
        frames.pipe(
          Stream.tap(({ model, dispatch }) =>
            Effect.sync(() => {
              counts.push(model.count)
              // A buggy view: it forges a message, then sends the one it was offered.
              dispatch('Forbidden' as Offered<Message>)
              dispatch(Opt.getOrThrow(model.increment))
            })
          ),
          Stream.take(2),
          Stream.runDrain,
        ),
      {
        onRejected: 'ignore',
        onBug: (bug) => Effect.sync(() => bugs.push(bug._tag === 'Rejected' ? bug.message : bug._tag)),
      },
    )))
    expect(Exit.isSuccess(exit)).toBe(true)
    expect(counts).toEqual([0, 1])
    // The second frame's messages are never handled: the run ends with the renderer.
    expect(bugs).toEqual(['Forbidden'])
  })

  test('there is no default for rejections, and onRejected: \'ignore\' requires onBug', () => {
    const optionsAreRequired: undefined extends Parameters<typeof run>[2] ? false : true = true
    // @ts-expect-error a bug that is neither fatal nor reported would go unnoticed
    const unreported: RunOptions<Message> = { onRejected: 'ignore' }
    expect([optionsAreRequired, unreported.onRejected]).toEqual([true, 'ignore'])
  })

  test('the run ends when the renderer ends', async () => {
    const exit = await Effect.runPromiseExit(quietly(runDying(counter, (frames) => Stream.runHead(frames))))
    expect(Exit.isSuccess(exit)).toBe(true)
  })
})

describe('onBug', () => {
  /** What `onBug` reports: where a defect happened (a subscription by its key), or `Rejected`. */
  const label = (bug: Engine.Bug<Message>) =>
    bug._tag === 'Rejected' ? 'Rejected' : bug.where._tag === 'Subscription' ? bug.where.key : bug.where._tag

  /** Runs `program` until it dies, drawing every frame with `draw`, and returns what `onBug` reported. */
  const diesIn = async <Model>(
    program: Program<number, Model, Message, never>,
    draw: (frame: Readonly<{ model: Model; dispatch: (message: Offered<Message>) => void }>) => void = () => {},
  ) => {
    const bugs: Array<unknown> = []
    const exit = await Effect.runPromiseExit(quietly(run(
      program,
      (frames) => frames.pipe(Stream.tap((frame) => Effect.sync(() => draw(frame))), Stream.runDrain),
      { onRejected: 'die', onBug: (bug) => Effect.sync(() => bugs.push(label(bug))) },
    )))
    return { died: Exit.isFailure(exit), bugs }
  }

  test('a defect in a command is reported as such, and the run dies', async () => {
    expect(await diesIn({ ...counter, init: { state: 0, commands: [Effect.die('boom')] } })).toEqual({
      died: true,
      bugs: ['Command'],
    })
  })

  test('a defect in a subscription is reported with its key', async () => {
    const broken: Program<number, unknown, Message, never> = {
      ...counter,
      subscriptions: () => HashMap.make(['broken', Channel.die('boom')]),
    }
    expect(await diesIn(broken)).toEqual({ died: true, bugs: ['broken'] })
  })

  test('a defect in update is reported as such', async () => {
    const throwing: Program<number, unknown, Message, never> = {
      ...counter,
      update: () => () => {
        throw new Error('boom')
      },
      makeModel: () => ({}),
    }
    // A view of a buggy update: it sends a message without asking the model.
    expect(await diesIn(throwing, ({ dispatch }) => dispatch('Increment' as Offered<Message>))).toEqual({
      died: true,
      bugs: ['Update'],
    })
  })

  test('a rejected message from the current frame is reported, and is fatal with onRejected: \'die\'', async () => {
    expect(await diesIn(counter, ({ dispatch }) => dispatch('Forbidden' as Offered<Message>))).toEqual({
      died: true,
      bugs: ['Rejected'],
    })
  })
})
