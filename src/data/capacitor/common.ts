import {
	either as E,
	function as F,
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/lib/PathReporter'

import type {
	Log,
	LogSeverity,
} from '@/app/interfaces/write/log'

const flow = F.flow
const pipe = F.pipe

const log =
	(data: {
		severity: LogSeverity
		message: string
	}) =>
	(log: Log) =>
		log(data)

export const decodeData: <A>(
	strict: t.Decoder<unknown, A>,
	fallback: t.Decoder<unknown, A>,
) => (
	data: unknown,
) => RTE.ReaderTaskEither<Log, string, A> = (
	strict,
	fallback,
) =>
	flow(
		RT.of,
		RT.bindTo('data'),
		RT.bind('result', ({ data }) =>
			pipe(strict.decode(data), RT.of),
		),
		R.map(TE.fromTask),
		RTE.bind('decoded', ({ result, data }) =>
			pipe(
				result,
				RTE.fromEither,
				RTE.matchE(
					flow(
						E.left,
						PathReporter.report,
						RT.of,
						RT.chain(messages =>
							pipe(
								log({
									severity: 'warning',
									message: messages.join(', '),
								}),
								RT.fromReaderIO,
							),
						),
						RT.chainW(() =>
							pipe(
								fallback.decode(data),
								RTE.fromEither,
							),
						),
					),
					RTE.right,
				),
			),
		),
		RTE.matchE(
			flow(
				E.left,
				PathReporter.report,
				RT.of,
				RT.chain(messages =>
					pipe(
						log({
							severity: 'error',
							message: messages.join(', '),
						}),
						RT.fromReaderIO,
					),
				),

				RT.map(() =>
					E.left('Some products are corrupt'),
				),
			),
			({ decoded }) => RTE.of(decoded),
		),
	)
