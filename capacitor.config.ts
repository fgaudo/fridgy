import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'net.gaudo.fridgy',
	appName: 'Fridgy',
	webDir: 'dist',
	server: {
		androidScheme: 'https',
	},
}

export default config
