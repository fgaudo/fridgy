import { C, Eff } from '$lib/core/imports.ts'

export class LogWithLevel extends C.Tag(
	'app/Log',
)<LogWithLevel, typeof Eff.logWithLevel>() {}
