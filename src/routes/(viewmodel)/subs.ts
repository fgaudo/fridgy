import { Schedule } from 'effect'

import { D, Str, pipe } from '$lib/core/imports.ts'

import { refreshTime } from './commands.ts'

const refreshTimeIntervalFrequency = D.seconds(20)

export const refreshTimeInterval = pipe(
	Str.fromEffect(refreshTime),
	Str.repeat(Schedule.spaced(refreshTimeIntervalFrequency)),
)
