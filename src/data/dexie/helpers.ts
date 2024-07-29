async function tryPersistWithoutPromtingUser() {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!navigator.storage?.persisted) {
		return 'never'
	}
	let persisted =
		await navigator.storage.persisted()
	if (persisted) {
		return 'persisted'
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!navigator.permissions?.query) {
		return 'prompt' // It MAY be successful to prompt. Don't know.
	}
	const permission =
		await navigator.permissions.query({
			name: 'persistent-storage',
		})
	if (permission.state === 'granted') {
		persisted = await navigator.storage.persist()
		if (persisted) {
			return 'persisted'
		} else {
			throw new Error('Failed to persist')
		}
	}
	if (permission.state === 'prompt') {
		return 'prompt'
	}
	return 'never'
}
