/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	plugins: [],
	theme: {
		fontWeight: {
			titleLarge:
				'var(--md-sys-typescale-title-large-weight)',
		},
		fontFamily: {
			titleLarge:
				'var(--md-sys-typescale-title-large-font)',
		},
		lineHeight: {
			titleLarge:
				'var(--md-sys-typescale-title-large-line-height)',
		},
		fontSize: {
			titleLarge:
				'var(--md-sys-typescale-title-large-size)',
		},
		colors: {
			onSurface: {
				DEFAULT: 'var(--md-sys-color-on-surface)',
				container:
					'var(--md-sys-color-on-surface-container)',
			},
			surface: {
				DEFAULT: 'var(--md-sys-color-surface)',
				container:
					'var(--md-sys-color-surface-container)',
			},
		},
	},
}
