import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'net.gaudo.fridgy',
	appName: 'fridgy',
	webDir: 'dist',
	plugins: {
		SystemBars: {
			insetsHandling: 'css',
			style: 'DEFAULT',
			hidden: false,
			animation: 'NONE',
		},
		SplashScreen: {
			launchAutoHide: false,
			launchFadeOutDuration: 3000,
			backgroundColor: '#ffffffff',
			androidSplashResourceName: 'splash',
			androidScaleType: 'CENTER_CROP',
			showSpinner: true,
			androidSpinnerStyle: 'large',
			iosSpinnerStyle: 'small',
			spinnerColor: '#999999',
			splashFullScreen: true,
			splashImmersive: true,
			layoutName: 'launch_screen',
			useDialog: true,
		},
	},
}

export default config
