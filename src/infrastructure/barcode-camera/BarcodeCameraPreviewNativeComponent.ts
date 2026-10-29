// The spec of the preview (`BarcodeCameraPreviewManager.kt`), from which React Native's codegen writes its
// interface: the codegen reads the file's name and its shape.
import { codegenNativeComponent, type ViewProps } from 'react-native'

export interface NativeProps extends ViewProps {}

/** Where the camera draws itself while it reads (`reads`, in `barcode-camera.ts`); blank otherwise. */
export default codegenNativeComponent<NativeProps>('BarcodeCameraPreview')
