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
			fontFamily: {
				titleLarge: 'var(--fridgy-title-font)',
			},
			colors: {
				background:
					'rgb(var(--mdui-color-background))',
				primary: 'rgb(var(--mdui-color-primary))',
				onSurface: {
					DEFAULT:
						'rgb(var(--mdui-color-on-surface))',
					container:
						'rgb(var(--mdui-color-on-surface-container))',
					variant:
						'rgb(var(--mdui-color-on-surface-variant))',
				},
				surface: {
					variant:
						'rgb(var(--mdui-color-surface-variant))',
					DEFAULT:
						'rgb(var(--mdui-color-surface))',
					container:
						'rgb(var(--mdui-color-surface-container))',
				},
				inverse: {
					onSurface:
						'rgb(var(--mdui-color-inverse-on-surface))',
					primary:
						'rgb(var(--mdui-color-inverse-primary))',
					surface:
						'rgb(var(--mdui-color-inverse-surface))',
				},
			},
		},
	},
}
