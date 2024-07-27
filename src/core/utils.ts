export const generateHexColor = () => {
	const alphabet = 'ABCDEF0123456789'

	const randomize = () =>
		alphabet[
			Math.floor(Math.random() * alphabet.length)
		]
	return `#${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}`
}
