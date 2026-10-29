package net.gaudo.fridgy.barcodecamera

import android.Manifest
import android.content.pm.PackageManager
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraState
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.Observer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.PermissionAwareActivity
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import zxingcpp.BarcodeReader

/**
 * The back camera, reading the barcodes of retail products while `start`ed, and drawing itself in the
 * [BarcodeCameraPreviewView] attached meanwhile. Every use of CameraX runs on the main thread.
 */
@ReactModule(name = BarcodeCameraModule.NAME)
class BarcodeCameraModule(context: ReactApplicationContext) : NativeBarcodeCameraSpec(context) {
  private val mainExecutor = ContextCompat.getMainExecutor(context)
  private var analyzing: ExecutorService? = null
  // Bumped by each start and stop: a provider that arrives after a stop binds nothing.
  private var session = 0
  private var bound: Bound? = null
  private var previewView: PreviewView? = null

  private class Bound(
    val provider: ProcessCameraProvider,
    val owner: LifecycleOwner,
    val analysis: ImageAnalysis,
    val cameraState: LiveData<CameraState>,
    val observer: Observer<CameraState>,
    var preview: Preview? = null,
  )

  override fun getName(): String = NAME

  override fun hasCamera(): Boolean =
    reactApplicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA)

  override fun start(promise: Promise) {
    mainExecutor.execute {
      unbind()
      val current = ++session
      val activity = reactApplicationContext.currentActivity
      if (activity !is LifecycleOwner || activity !is PermissionAwareActivity) {
        promise.reject("no_activity", "No activity to open the camera in")
        return@execute
      }
      if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
        open(current, activity, promise)
        return@execute
      }
      // Android shows its dialog only while the permission is neither granted nor refused for good.
      activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), PERMISSION_REQUEST) { code, _, results ->
        if (code != PERMISSION_REQUEST) return@requestPermissions false
        if (results.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
          open(current, activity, promise)
        } else {
          promise.reject("permission_denied", "The camera's permission was refused")
        }
        true
      }
    }
  }

  private fun open(current: Int, owner: LifecycleOwner, promise: Promise) {
    val future = ProcessCameraProvider.getInstance(reactApplicationContext)
    future.addListener({
      if (current != session) {
        promise.resolve(null)
        return@addListener
      }
      try {
        bind(future.get(), owner)
        promise.resolve(null)
      } catch (error: Exception) {
        unbind()
        promise.reject("camera_failed", error)
      }
    }, mainExecutor)
  }

  override fun stop() {
    mainExecutor.execute {
      session++
      unbind()
    }
  }

  override fun invalidate() {
    stop()
    super.invalidate()
  }

  fun attach(view: PreviewView) {
    previewView = view
    bindPreview()
  }

  fun detach(view: PreviewView) {
    if (previewView !== view) return
    previewView = null
    bound?.let { bound -> bound.preview?.let { bound.provider.unbind(it) } }
    bound?.preview = null
  }

  private fun bind(provider: ProcessCameraProvider, owner: LifecycleOwner) {
    val reader = BarcodeReader(
      BarcodeReader.Options(
        formats = setOf(
          BarcodeReader.Format.EAN_13,
          BarcodeReader.Format.EAN_8,
          BarcodeReader.Format.UPC_A,
          BarcodeReader.Format.UPC_E,
        ),
        tryRotate = true,
      )
    )
    val executor = Executors.newSingleThreadExecutor()
    analyzing = executor
    // Only the latest frame is read: a slow read skips frames instead of falling behind the camera.
    val analysis = ImageAnalysis.Builder()
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
    analysis.setAnalyzer(executor) { image ->
      // zxing-cpp gives every code but an EAN-8 as the 13 digits of an EAN-13: a UPC-A gets its leading 0, a UPC-E
      // is expanded first.
      image.use { reader.read(it) }.firstNotNullOfOrNull { it.text }?.let { emitOnRead(it) }
    }
    val camera = provider.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, analysis)
    // A camera CameraX closes with an error has given up: a recoverable one is retried, while opening.
    val observer = Observer<CameraState> { state ->
      val error = state.error
      if (error != null && state.type == CameraState.Type.CLOSED) {
        emitOnError("Camera closed with error ${error.code}")
      }
    }
    camera.cameraInfo.cameraState.observe(owner, observer)
    bound = Bound(provider, owner, analysis, camera.cameraInfo.cameraState, observer)
    bindPreview()
  }

  private fun bindPreview() {
    val bound = bound ?: return
    val view = previewView ?: return
    if (bound.preview != null) return
    val preview = Preview.Builder().build()
    preview.surfaceProvider = view.surfaceProvider
    bound.provider.bindToLifecycle(bound.owner, CameraSelector.DEFAULT_BACK_CAMERA, preview)
    bound.preview = preview
  }

  private fun unbind() {
    val bound = bound ?: return
    this.bound = null
    bound.cameraState.removeObserver(bound.observer)
    bound.analysis.clearAnalyzer()
    bound.provider.unbind(bound.analysis)
    bound.preview?.let { bound.provider.unbind(it) }
    analyzing?.shutdown()
    analyzing = null
  }

  companion object {
    const val NAME = "BarcodeCamera"
    private const val PERMISSION_REQUEST = 0xCA3
  }
}
