import { Exception } from '@/core/exception'
import { ObservableOption } from 'fp-ts-rxjs/lib/ObservableOption'

export type Log = (
	message: string,
	timestamp: number
) => ObservableOption<Exception>
