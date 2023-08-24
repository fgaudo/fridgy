import { Exception } from '@/core/exception'
import { Option } from 'fp-ts/lib/Option'
import { Observable } from 'rxjs'

export type Log = (
	message: string,
	timestamp: number
) => Observable<Option<Exception>>
