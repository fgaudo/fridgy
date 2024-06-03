import * as EQ from 'fp-ts/lib/Eq'
import { flow, pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/string'
import * as B from 'js-base64'
import { type Newtype, iso } from 'newtype-ts'

export type Base64 = Newtype<
	{ readonly Id: unique symbol },
	string
>

export const Base64 = {
	Eq: EQ.fromEquals<Base64>((a, b) =>
		S.Eq.equals(
			pipe(a, idIso.unwrap, B.Base64.decode),
			pipe(b, idIso.unwrap, B.Base64.decode),
		),
	),
} as const

const idIso = iso<Base64>()

export const fromString: (
	text: string,
) => Base64 = flow(B.Base64.encode, idIso.wrap)

export const toString: (id: Base64) => string =
	flow(idIso.unwrap, B.Base64.decode)

export const Eq: EQ.Eq<Base64> =
	EQ.fromEquals<Base64>((a, b) =>
		S.Eq.equals(idIso.unwrap(a), idIso.unwrap(b)),
	)
