/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')
const withMT = require('@material-tailwind/react/utils/withMT')

module.exports = withMT({
	content: ['./public/**/index.html', './src/**/*.{jsx,tsx}'],
	theme: {
		extend: {
			transitionProperty: {
				height: 'max-height'
			},
			colors: {
				primary: '#010101'
			},
			fontFamily: {
				sans: ['Inter var', ...defaultTheme.fontFamily.sans]
			}
		}
	},
	plugins: []
})
