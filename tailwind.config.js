/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	plugins: [],
	theme: {
		lineHeight: {
			mdTitleLarge: '28px',
		},
		fontSize: {
			mdTitleLarge: '22px',
		},
		colors: {
			mdOnSurface: {
				DEFAULT: 'var(--md-sys-color-on-surface)',
				container:
					'var(--md-sys-color-on-surface-container)',
			},
			mdSurface: {
				DEFAULT: 'var(--md-sys-color-surface)',
				container:
					'var(--md-sys-color-surface-container)',
			},
		},
	},
}
