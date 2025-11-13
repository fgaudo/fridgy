import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

export const runtime = ManagedRuntime.make(Layer.empty)
