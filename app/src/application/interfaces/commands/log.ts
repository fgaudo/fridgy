import { Exception } from '@/core/exception'
import { Single } from '@/core/single'
import { Option } from 'fp-ts/lib/Option'

export type Log = (
	message: string,
	timestamp: number
) => Single<Option<Exception>>
