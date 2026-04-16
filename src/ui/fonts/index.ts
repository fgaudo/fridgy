import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'

export const loadFonts = Effect.gen(function* () {
	const comfortaaLatinPath = yield* Config.string('FONT_COMFORTAA_LATIN_PATH')
	const comfortaaLatinExtPath = yield* Config.string(
		'FONT_COMFORTAA_LATIN_EXT_PATH',
	)
	const comfortaaLatinExt = new FontFace(
		'Comfortaa',
		`url(${comfortaaLatinExtPath})`,
		{
			style: 'normal',
			weight: '300 700',
			display: 'swap',
			unicodeRange:
				'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
		},
	)
	const comfortaaLatin = new FontFace(
		'Comfortaa',
		`url(${comfortaaLatinPath})`,
		{
			style: 'normal',
			weight: '300 700',
			display: 'swap',
			unicodeRange:
				'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
		},
	)
	yield* Effect.sync(() => {
		document.fonts.add(comfortaaLatinExt)
	})
	yield* Effect.sync(() => {
		document.fonts.add(comfortaaLatin)
	})
	return yield* Effect.promise(() =>
		Promise.all([comfortaaLatinExt.load(), comfortaaLatin.load()]),
	)
}).pipe(Effect.orDie)
