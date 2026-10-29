package net.gaudo.fridgy.barcodecamera

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.BarcodeCameraPreviewManagerDelegate
import com.facebook.react.viewmanagers.BarcodeCameraPreviewManagerInterface

@ReactModule(name = BarcodeCameraPreviewManager.NAME)
class BarcodeCameraPreviewManager :
  SimpleViewManager<BarcodeCameraPreviewView>(),
  BarcodeCameraPreviewManagerInterface<BarcodeCameraPreviewView> {
  private val delegate = BarcodeCameraPreviewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<BarcodeCameraPreviewView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): BarcodeCameraPreviewView =
    BarcodeCameraPreviewView(context)

  companion object {
    const val NAME = "BarcodeCameraPreview"
  }
}
