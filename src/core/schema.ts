import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as ParseResult from 'effect/ParseResult'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'

export const OptionFromValue = <T extends Schema.Any>(schema: T) => {
	const type = Schema.typeSchema(Schema.asSchema(schema))
	return Schema.transformOrFail(schema, Schema.OptionFromSelf(type), {
		strict: true,
		decode: Effect.fn(function* (input) {
			const decodedValue = yield* Effect.either(Schema.decode(type)(input))

			if (Result.isSuccess(decodedValue)) {
				return yield* ParseResult.fail(decodedValue.success.issue)
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
