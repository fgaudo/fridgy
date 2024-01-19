import type { Component, JSX } from 'solid-js'

export const Spinner: Component<
	JSX.HTMLAttributes<HTMLDivElement>
> = props => {
	return (
		<div {...props}>
			<div class="relative inline-block h-[80px] w-[80px]">
				<div
					style={{
						'border-radius': '50%',
						animation:
							'lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) -0.45s infinite',
					}}
					class="absolute m-[8px] box-border block h-[64px] w-[64px] border-[4px] border-b-transparent border-l-transparent border-r-transparent border-t-[var(--md-sys-color-primary)]"
				/>
				<div
					style={{
						'border-radius': '50%',
						animation:
							'lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) -0.3s infinite',
					}}
					class="absolute m-[8px] box-border block h-[64px] w-[64px] border-[4px] border-b-transparent border-l-transparent border-r-transparent border-t-[var(--md-sys-color-primary)]"
				/>
				<div
					style={{
						'border-radius': '50%',
						animation:
							'lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) -0.15s infinite',
					}}
					class="absolute m-[8px] box-border block h-[64px] w-[64px] border-[4px] border-b-transparent border-l-transparent border-r-transparent border-t-[var(--md-sys-color-primary)]"
				/>
			</div>
		</div>
	)
}

/*.lds-ring {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 64px;
  height: 64px;
  margin: 8px;
  border: 8px solid #fff;
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #fff transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

 *
 */
