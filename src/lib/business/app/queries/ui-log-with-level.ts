import { C, Eff } from '$lib/core/imports.ts'

export class UiLogWithLevel extends C.Tag(
	'app/Log',
)<UiLogWithLevel, typeof Eff.logWithLevel>() {}
