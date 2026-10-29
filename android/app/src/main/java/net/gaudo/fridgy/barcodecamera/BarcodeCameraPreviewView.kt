package net.gaudo.fridgy.barcodecamera

import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import com.facebook.react.uimanager.ThemedReactContext

/** Where the camera draws itself, while it is on and this view is on the screen. */
class BarcodeCameraPreviewView(private val context: ThemedReactContext) : FrameLayout(context) {
  private val preview = PreviewView(context).apply {
    // A TextureView, which React Native's views can be drawn over: a SurfaceView is a window of its own.
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    scaleType = PreviewView.ScaleType.FILL_CENTER
  }

  // React Native lays out only its own views: the views CameraX adds are laid out here, as requested.
  private val layoutAgain = Runnable {
    measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    layout(left, top, right, bottom)
  }

  init {
    addView(preview, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  override fun requestLayout() {
    super.requestLayout()
    post(layoutAgain)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    camera()?.attach(preview)
  }

  override fun onDetachedFromWindow() {
    camera()?.detach(preview)
    super.onDetachedFromWindow()
  }

  private fun camera(): BarcodeCameraModule? =
    context.reactApplicationContext.getNativeModule(BarcodeCameraModule::class.java)
}
