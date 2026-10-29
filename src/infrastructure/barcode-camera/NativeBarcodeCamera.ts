// The spec of the native module (`BarcodeCameraModule.kt`), from which React Native's codegen writes its Java
// interface: the codegen reads the file's name and its shape.
import { type CodegenTypes, type TurboModule, TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  /** Whether the device has a back camera. */
  hasCamera(): boolean
  /**
   * Turns the camera on, once its permission is asked for and granted: it reads until `stop`. Fails when the
   * permission is refused or the camera cannot be opened.
   */
  start(): Promise<void>
  stop(): void
  /** The digits of a code read: an EAN-8's 8, or the 13 of an EAN-13, which a UPC-A or a UPC-E is read as. */
  readonly onRead: CodegenTypes.EventEmitter<string>
  /** The camera closed by itself after `start`: it reads no more. */
  readonly onError: CodegenTypes.EventEmitter<string>
}

export default TurboModuleRegistry.getEnforcing<Spec>('BarcodeCamera')
