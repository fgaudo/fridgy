import * as EQ from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/string'
import { type Newtype, iso } from 'newtype-ts'

export type Id = Newtype<
	{ readonly Id: unique symbol },
	string
>

const idIso = iso<Id>()

export function fromString(idString: string): Id {
	return idIso.wrap(idString)
}

export function toString(id: Id): string {
	return idIso.unwrap(id)
}

export const Eq: EQ.Eq<Id> = EQ.fromEquals<Id>(
	(a, b) =>
		S.Eq.equals(idIso.unwrap(a), idIso.unwrap(b)),
)
