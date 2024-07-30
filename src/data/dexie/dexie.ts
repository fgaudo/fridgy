import Dexie from 'dexie'
import { either as E } from 'fp-ts'

async function persistStorage() {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	return navigator.storage?.persist?.()
}

export const createDB = async (): Promise<
	E.Either<string, Dexie>
> => {
	const result = await persistStorage()

	if (!result) {
		return E.left(
			'This app needs persistent storage to work. Please restart the app and make sure to give storage permissions',
		)
	}

	const db = new Dexie('Fridgy')

	db.version(1).stores({
		products: '++id, name',
	})

	return E.right(db)
}
