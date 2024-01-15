import {
	DynamicColor,
	DynamicScheme,
	MaterialDynamicColors,
	hexFromArgb,
} from '@material/material-color-utilities'
import '@material/web/checkbox/checkbox'
import '@material/web/divider/divider'
import '@material/web/elevation/elevation'
import '@material/web/fab/fab'
import '@material/web/icon/icon'
import '@material/web/iconbutton/icon-button'
import '@material/web/list/list'
import '@material/web/list/list-item'

const snakeCaseToKebab = (str: string) =>
	str.replace(/_/g, '-')

export function applyTheme(
	target: HTMLElement,
	scheme: DynamicScheme,
) {
	const entries = Object.values(
		MaterialDynamicColors,
	)
	for (const color of entries) {
		if (color instanceof DynamicColor) {
			const token = snakeCaseToKebab(color.name)
			target.style.setProperty(
				`--md-sys-color-${token}`,
				hexFromArgb(color.getArgb(scheme)),
			)
		}
	}
}
