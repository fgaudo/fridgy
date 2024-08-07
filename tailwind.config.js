/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	plugins: [],
	theme: {
		extend: {
			transitionDuration: {
				fade: '300ms',
			},
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
				background:
					'var(--md-sys-color-background)',
				primary: 'var(--md-sys-color-primary)',
				onSurface: {
					DEFAULT:
						'var(--md-sys-color-on-surface)',
					container:
						'var(--md-sys-color-on-surface-container)',
					variant:
						'var(--md-sys-color-on-surface-variant)',
				},
				surface: {
					variant:
						'var(--md-sys-color-surface-variant)',
					DEFAULT: 'var(--md-sys-color-surface)',
					container:
						'var(--md-sys-color-surface-container)',
				},
				inverse: {
					onSurface:
						'var(--md-sys-color-inverse-on-surface)',
					primary:
						'var(--md-sys-color-inverse-primary)',
					surface:
						'var(--md-sys-color-inverse-surface)',
				},
			},
		},
	},
}
