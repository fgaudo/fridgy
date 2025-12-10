import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Option from 'effect/Option'
import * as ParseResult from 'effect/ParseResult'
import * as Schema from 'effect/Schema'

export const OptionFromValue = <T extends Schema.Schema.Any>(schema: T) => {
	const type = Schema.typeSchema(Schema.asSchema(schema))
	return Schema.transformOrFail(schema, Schema.OptionFromSelf(type), {
		strict: true,
		decode: Effect.fn(function* (input) {
			const decodedValue = yield* Effect.either(Schema.decode(type)(input))

			if (Either.isLeft(decodedValue)) {
				return yield* ParseResult.fail(decodedValue.left.issue)
			}

			return Option.some(decodedValue.right)
		}),

		encode: Effect.fn(function* (input, _, ast) {
			if (Option.isNone(input)) {
				return yield* ParseResult.fail(new ParseResult.Type(ast, input))
			}

			return input.value
		}),
	})
}
