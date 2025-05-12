import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'net.gaudo.fridgy',
	appName: 'Fridgy',
	webDir: 'build',
	server: {
		androidScheme: 'https',
	},
}

export default config
