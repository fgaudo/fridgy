import { Schedule } from 'effect'

import { D, Str, pipe } from '$lib/core/imports.ts'

import { Message } from './update.svelte.ts'

const refreshTimeIntervalFrequency = D.seconds(20)

export const refreshTimeInterval = pipe(
	Str.make(Message.StartRefreshTime()),
	Str.repeat(Schedule.spaced(refreshTimeIntervalFrequency)),
)
