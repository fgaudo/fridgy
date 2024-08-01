import {
	eq as EQ,
	function as F,
	option as OPT,
	string as S,
} from 'fp-ts'
import * as B from 'js-base64'
import { type Newtype, iso } from 'newtype-ts'

const pipe = F.pipe
const flow = F.flow
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

export const encodeText: (
	text: string,
) => Base64 = flow(B.Base64.encodeURI, idIso.wrap)

export const decodeText: (
	base64: Base64,
) => string = flow(idIso.unwrap, B.Base64.decode)

export const fromBase64String: (
	base64: string,
) => OPT.Option<Base64> = base64 =>
	B.Base64.isValid(base64)
		? OPT.some(idIso.wrap(base64))
		: OPT.none

export const toString: (id: Base64) => string =
	idIso.unwrap

export const fromBigint: (
	number: bigint,
) => Base64 = number => {
	const uint8array = new Uint8Array(8)

	new DataView(
		uint8array.buffer,
		0,
		8,
	).setBigInt64(0, number)
	return idIso.wrap(
		B.fromUint8Array(uint8array, true),
	)
}

export const toBigInt: (
	base64: Base64,
) => bigint = base64 => {
	const b = B.toUint8Array(idIso.unwrap(base64))
	return new DataView(b.buffer, 0, 8).getBigInt64(
		0,
	)
}
